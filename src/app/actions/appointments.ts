"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireBarber } from "@/lib/auth/current-user";
import { createAppointment } from "@/lib/booking/create-appointment";
import { rescheduleAppointment } from "@/lib/booking/reschedule";
import { slotsForBarber } from "@/lib/availability/query";
import { formatMinutes } from "@/lib/shop";
import { fromZonedTime } from "date-fns-tz";
import { bookingDetailsFor } from "@/lib/notifications/booking-details";
import { sendBookingCancelled, sendBookingConfirmation } from "@/lib/notifications/send";

/**
 * Barber-side appointment actions.
 *
 * Every one re-checks authentication. A server action is a public endpoint,
 * and these change money and client records.
 *
 * Completing and no-showing also roll up the client's counters, so the
 * client list reflects reality without a nightly job recomputing it.
 */

const Id = z.object({ id: z.string().min(1).max(40) });

async function loadOwned(id: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: { id: true, clientId: true, priceCents: true, status: true, startsAt: true },
  });
  if (!appointment) throw new Error("Appointment not found.");
  return appointment;
}

export async function completeAppointmentAction(formData: FormData) {
  await requireBarber();
  const { id } = Id.parse({ id: formData.get("id") });
  const appointment = await loadOwned(id);

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id },
      data: { status: "COMPLETED" },
    }),
    prisma.client.update({
      where: { id: appointment.clientId },
      data: {
        visitCount: { increment: 1 },
        totalSpentCents: { increment: appointment.priceCents },
        lastVisitAt: appointment.startsAt,
      },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
}

export async function markNoShowAction(formData: FormData) {
  await requireBarber();
  const { id } = Id.parse({ id: formData.get("id") });
  const appointment = await loadOwned(id);

  // The deposit is deliberately not refunded here — that is what it is for.
  await prisma.$transaction([
    prisma.appointment.update({
      where: { id },
      data: { status: "NO_SHOW" },
    }),
    prisma.client.update({
      where: { id: appointment.clientId },
      data: { noShowCount: { increment: 1 } },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/clients");
}

const CancelInput = Id.extend({
  reason: z.string().trim().max(300).optional(),
});

export async function cancelAppointmentAction(formData: FormData) {
  const barber = await requireBarber();
  const { id, reason } = CancelInput.parse({
    id: formData.get("id"),
    reason: formData.get("reason") || undefined,
  });

  await prisma.appointment.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: `barber:${barber.email}`,
      cancellationReason: reason ?? "Cancelled by the shop",
    },
  });

  // The client did not choose this, so telling them is not optional.
  const context = await bookingDetailsFor(id);
  if (context) {
    await sendBookingCancelled(id, context.recipient, context.details);
  }

  revalidatePath("/dashboard");
}

const NoteInput = Id.extend({ notes: z.string().trim().max(2000) });

export async function saveBarberNoteAction(formData: FormData) {
  await requireBarber();
  const { id, notes } = NoteInput.parse({
    id: formData.get("id"),
    notes: formData.get("notes") ?? "",
  });

  await prisma.appointment.update({
    where: { id },
    data: { barberNotes: notes || null },
  });

  revalidatePath("/dashboard");
}


const WalkInInput = z.object({
  barberSlug: z.string().min(1).max(64),
  serviceSlug: z.string().min(1).max(64),
  /** Shop-local "YYYY-MM-DDTHH:mm" from a datetime-local input. */
  start: z.string().min(10).max(30),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().min(7, "Add a phone number").max(40),
  source: z.enum(["WALK_IN", "PHONE"]),
});

export type WalkInState = { error?: string; ok?: boolean };

/**
 * Books someone the barber is standing in front of, or has on the phone.
 *
 * Lead time is skipped: a walk-in is by definition happening now, and the
 * two-hour rule that stops clients booking last-minute online would make
 * this unusable. The exclusion constraint still applies, so the barber
 * cannot double-book himself either.
 *
 * If the calendar cannot represent his actual day, it is wrong within a week
 * and he stops opening it — which is the real failure mode for this app.
 */
export async function createWalkInAction(
  _previous: WalkInState,
  formData: FormData,
): Promise<WalkInState> {
  await requireBarber();

  const parsed = WalkInInput.safeParse({
    barberSlug: formData.get("barberSlug"),
    serviceSlug: formData.get("serviceSlug"),
    start: formData.get("start"),
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    source: formData.get("source") ?? "WALK_IN",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  const start = shopLocalToUtc(parsed.data.start, settings?.timezone ?? "America/New_York");

  const result = await createAppointment({
    ...parsed.data,
    start: start.toISOString(),
    skipLeadTime: true,
  });

  if (!result.ok) return { error: result.message };

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Converts a shop-local wall-clock string to a UTC instant.
 *
 * The datetime-local input gives "2026-09-15T14:30" with no zone. Reading it
 * with `new Date()` would interpret it in the *server's* zone — UTC in
 * production — booking every walk-in several hours out. fromZonedTime does
 * the conversion through the timezone, so it stays correct across DST.
 */
function shopLocalToUtc(local: string, timeZone: string): Date {
  return fromZonedTime(`${local}:00`, timeZone);
}


/**
 * Open times for moving an appointment, from the barber's side.
 *
 * Same barber and service — moving someone to a different barber is a
 * different conversation, and doing it silently from a calendar drag would
 * be a good way to have two people expect the same person.
 */
export async function barberRescheduleOptionsAction(
  appointmentId: string,
  date: string,
): Promise<{ start: string; label: string }[]> {
  await requireBarber();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      barber: { select: { slug: true } },
      service: { select: { slug: true } },
    },
  });
  if (!appointment) return [];

  const slots = await slotsForBarber(
    appointment.barber.slug,
    appointment.service.slug,
    date,
  );
  return slots.map((s) => ({
    start: s.start.toISOString(),
    label: formatMinutes(s.startMinutes),
  }));
}

export type BarberRescheduleState = { error?: string; moved?: boolean };

export async function barberRescheduleAction(
  _previous: BarberRescheduleState,
  formData: FormData,
): Promise<BarberRescheduleState> {
  await requireBarber();

  const parsed = z
    .object({
      id: z.string().min(1).max(40),
      start: z.string().min(10).max(40),
    })
    .safeParse({ id: formData.get("id"), start: formData.get("start") });

  if (!parsed.success) return { error: "Pick a time." };

  const start = new Date(parsed.data.start);
  if (Number.isNaN(start.getTime())) return { error: "That time is not valid." };

  const result = await rescheduleAppointment(parsed.data.id, start);
  if (!result.ok) return { error: result.message };

  // The client did not ask for this, so tell them the new time.
  const context = await bookingDetailsFor(parsed.data.id);
  if (context) {
    await sendBookingConfirmation(parsed.data.id, context.recipient, context.details);
  }

  revalidatePath("/dashboard");
  return { moved: true };
}
