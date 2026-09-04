"use server";

import { z } from "zod";
import { slotsForAnyBarber, slotsForBarber } from "@/lib/availability/query";
import { createAppointment } from "@/lib/booking/create-appointment";
import { formatMinutes } from "@/lib/shop";
import type { BookingResult, TimeSlot } from "@/lib/booking/types";

/**
 * Server actions the booking UI calls.
 *
 * The availability engine and Prisma both run on the server only, so this is
 * the boundary the client component talks to. Input is validated here rather
 * than trusted from the browser — a server action is a public HTTP endpoint,
 * whatever it looks like in the source.
 */

const AvailabilityInput = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  serviceSlug: z.string().min(1).max(64),
  barberSlug: z.string().min(1).max(64).nullable(),
});

export async function getAvailabilityAction(
  raw: unknown,
): Promise<TimeSlot[]> {
  const parsed = AvailabilityInput.safeParse(raw);
  if (!parsed.success) return [];

  const { date, serviceSlug, barberSlug } = parsed.data;

  if (barberSlug) {
    const slots = await slotsForBarber(barberSlug, serviceSlug, date);
    return slots.map((s) => ({
      start: s.start.toISOString(),
      label: formatMinutes(s.startMinutes),
      available: true,
    }));
  }

  const merged = await slotsForAnyBarber(serviceSlug, date);
  return merged.map((s) => ({
    start: s.start.toISOString(),
    label: formatMinutes(s.startMinutes),
    available: true,
  }));
}


const BookingInput = z.object({
  serviceSlug: z.string().min(1).max(64),
  barberSlug: z.string().min(1).max(64).nullable(),
  start: z.string().min(1).max(40),
  name: z.string().trim().min(2, "Tell us your name").max(120),
  email: z.string().trim().email("That email does not look right").max(200),
  phone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(1000).optional(),
});

/**
 * Creates a booking.
 *
 * A server action is a public HTTP endpoint whatever it looks like in the
 * source, so everything is validated here rather than trusted from the
 * browser — including the barber and service, which the client controls.
 */
export async function createBookingAction(raw: unknown): Promise<BookingResult> {
  const parsed = BookingInput.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid",
      message: parsed.error.issues[0]?.message ?? "Check the details and try again.",
    };
  }

  const input = parsed.data;

  // "First available" resolves to a real chair before writing, so an
  // appointment always belongs to a specific barber.
  let barberSlug = input.barberSlug;
  if (!barberSlug) {
    const date = input.start.slice(0, 10);
    const merged = await slotsForAnyBarber(input.serviceSlug, date);
    const match = merged.find((s) => s.start.toISOString() === input.start);
    barberSlug = match?.barberIds[0] ?? null;
    if (!barberSlug) {
      return {
        ok: false,
        reason: "slot_taken",
        message: "That time just went. Pick another.",
      };
    }
  }

  return createAppointment({
    barberSlug,
    serviceSlug: input.serviceSlug,
    start: input.start,
    name: input.name,
    email: input.email,
    phone: input.phone,
    notes: input.notes,
  });
}
