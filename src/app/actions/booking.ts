"use server";

import { z } from "zod";
import { slotsForAnyBarber, slotsForBarber } from "@/lib/availability/query";
import { formatMinutes } from "@/lib/shop";
import type { TimeSlot } from "@/lib/booking/types";

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
