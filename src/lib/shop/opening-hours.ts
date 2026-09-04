import "server-only";
import { prisma } from "@/lib/db/client";
import type { DayHours } from "./hours";

/**
 * The shop's published opening hours.
 *
 * These are set explicitly rather than derived from whoever happens to be
 * working. Deriving them meant the shop could not be closed on a day without
 * editing every barber's schedule, and it read backwards: a shop decides its
 * own hours, and its barbers work inside them.
 *
 * The availability engine intersects the two, so nothing can be booked
 * outside these times whatever a barber's own hours say.
 */
const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

const SHORT_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export async function openingHours(): Promise<DayHours[]> {
  const rows = await prisma.shopHours.findMany();
  const byDay = new Map(rows.map((r) => [r.dayOfWeek, r]));

  return DAY_NAMES.map((day, dayOfWeek) => {
    const row = byDay.get(dayOfWeek);
    if (!row || row.isClosed) {
      return { day, short: SHORT_NAMES[dayOfWeek], opens: null, closes: null };
    }
    return {
      day,
      short: SHORT_NAMES[dayOfWeek],
      opens: row.opensAtMinutes,
      closes: row.closesAtMinutes,
    };
  });
}
