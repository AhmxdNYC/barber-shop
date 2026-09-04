"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import {
  hashManageToken,
  looksLikeManageToken,
  manageTokenExpired,
} from "@/lib/booking/manage-token";
import { bookingDetailsFor } from "@/lib/notifications/booking-details";
import { sendBookingCancelled, sendBookingConfirmation, sendManageLink } from "@/lib/notifications/send";
import { isRateLimited, reissueManageToken } from "@/lib/booking/recovery";
import { rescheduleAppointment } from "@/lib/booking/reschedule";
import { slotsForBarber } from "@/lib/availability/query";
import { prisma as db } from "@/lib/db/client";
import { formatMinutes } from "@/lib/shop";

/**
 * Guest booking management.
 *
 * The emailed link is the credential — there is no account. See
 * docs/GUEST-CANCELLATION.md for why the token is hashed, scoped and
 * expiring, and why cancelling is a POST rather than a link.
 */

export type RescheduleOption = {
  /** ISO instant. */
  start: string;
  label: string;
};

export type ManagedBooking = {
  id: string;
  startsAt: Date;
  status: string;
  serviceName: string;
  barberName: string;
  contactName: string;
  priceCents: number;
  canCancel: boolean;
  canReschedule: boolean;
  cancellationWindowHours: number;
};

export async function findBookingByToken(
  token: string,
): Promise<ManagedBooking | null> {
  // Reject obvious junk before it reaches the database.
  if (!looksLikeManageToken(token)) return null;

  const appointment = await prisma.appointment.findUnique({
    where: { manageTokenHash: hashManageToken(token) },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      priceCents: true,
      contactName: true,
      service: { select: { name: true } },
      barber: { select: { name: true } },
    },
  });
  if (!appointment) return null;
  if (manageTokenExpired(appointment.endsAt)) return null;

  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  const windowHours = settings?.cancellationWindowHours ?? 24;
  const hoursUntil =
    (appointment.startsAt.getTime() - Date.now()) / (60 * 60 * 1000);

  return {
    id: appointment.id,
    startsAt: appointment.startsAt,
    status: appointment.status,
    serviceName: appointment.service.name,
    barberName: appointment.barber.name,
    contactName: appointment.contactName,
    priceCents: appointment.priceCents,
    canCancel:
      (appointment.status === "CONFIRMED" ||
        appointment.status === "PENDING_PAYMENT") &&
      hoursUntil > 0,
    canReschedule:
      (appointment.status === "CONFIRMED" ||
        appointment.status === "PENDING_PAYMENT") &&
      hoursUntil > 0,
    cancellationWindowHours: windowHours,
  };
}

export type CancelState = { error?: string; cancelled?: boolean };

/**
 * Cancels a booking from the guest link.
 *
 * Deliberately a POST behind a confirmation, never a GET. Mail scanners and
 * link-preview bots follow URLs in emails, so a one-click cancel link would
 * be triggered by a robot and the client would arrive to find their haircut
 * already gone.
 */
export async function cancelByTokenAction(
  _previous: CancelState,
  formData: FormData,
): Promise<CancelState> {
  const parsed = z
    .object({ token: z.string().min(10).max(80) })
    .safeParse({ token: formData.get("token") });

  if (!parsed.success) return { error: "That link is not valid." };

  const booking = await findBookingByToken(parsed.data.token);
  if (!booking) return { error: "That link has expired or is not valid." };
  if (!booking.canCancel) {
    return { error: "This booking can no longer be cancelled online. Please call the shop." };
  }

  const hoursUntil = (booking.startsAt.getTime() - Date.now()) / (60 * 60 * 1000);
  const insideWindow = hoursUntil < booking.cancellationWindowHours;

  await prisma.appointment.update({
    where: { id: booking.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: "guest_token",
      cancellationReason: insideWindow
        ? "Cancelled by client inside the notice window"
        : "Cancelled by client",
    },
  });

  const context = await bookingDetailsFor(booking.id);
  if (context) {
    await sendBookingCancelled(booking.id, context.recipient, context.details);
  }

  revalidatePath("/dashboard");
  return { cancelled: true };
}


export type RecoverState = { sent?: boolean; error?: string };

/**
 * Sends a replacement booking link.
 *
 * Always answers the same way whether or not a booking exists. Any other
 * behaviour turns this into a way to test which email addresses are clients
 * of the shop — which is exactly the kind of thing a barbershop's clients
 * would not expect to be discoverable.
 */
export async function recoverBookingLinkAction(
  _previous: RecoverState,
  formData: FormData,
): Promise<RecoverState> {
  const parsed = z
    .object({ email: z.string().trim().email().max(200) })
    .safeParse({ email: formData.get("email") });

  // Even a malformed address gets the neutral answer, so the response
  // cannot be used to probe anything.
  if (!parsed.success) return { sent: true };

  const email = parsed.data.email.toLowerCase();

  if (await isRateLimited(email)) {
    return {
      error: "We've sent several links to that address recently. Check your inbox, or call the shop.",
    };
  }

  const reissued = await reissueManageToken(email);
  if (reissued) {
    const context = await bookingDetailsFor(reissued.appointmentId, reissued.token);
    if (context) {
      await sendManageLink(reissued.appointmentId, context.recipient, context.details);
    }
  }

  return { sent: true };
}


/**
 * Open times for moving an existing booking.
 *
 * Scoped to the same barber and service, because "reschedule" means the same
 * haircut with the same person at a different time. Changing either of those
 * is a new booking.
 */
export async function rescheduleOptionsAction(
  token: string,
  date: string,
): Promise<RescheduleOption[]> {
  const booking = await findBookingByToken(token);
  if (!booking || !booking.canReschedule) return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

  const appointment = await db.appointment.findUnique({
    where: { id: booking.id },
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

export type RescheduleState = { error?: string; moved?: boolean };

export async function rescheduleByTokenAction(
  _previous: RescheduleState,
  formData: FormData,
): Promise<RescheduleState> {
  const parsed = z
    .object({
      token: z.string().min(10).max(80),
      start: z.string().min(10).max(40),
    })
    .safeParse({ token: formData.get("token"), start: formData.get("start") });

  if (!parsed.success) return { error: "Pick a time and try again." };

  const booking = await findBookingByToken(parsed.data.token);
  if (!booking) return { error: "That link has expired or is not valid." };

  const start = new Date(parsed.data.start);
  if (Number.isNaN(start.getTime())) return { error: "That time is not valid." };

  const result = await rescheduleAppointment(booking.id, start);
  if (!result.ok) return { error: result.message };

  const context = await bookingDetailsFor(booking.id, parsed.data.token);
  if (context) {
    await sendBookingConfirmation(booking.id, context.recipient, context.details);
  }

  revalidatePath("/dashboard");
  return { moved: true };
}
