import "server-only";
import { prisma } from "@/lib/db/client";
import type { DayHours } from "./hours";

/**
 * The shop's opening hours, derived from who is actually working.
 *
 * These used to be a hardcoded array while availability came from the
 * database, so editing hours in the dashboard changed what could be booked
 * without changing what the website advertised. A client could read "open
 * until 7:30" and find no slots after five.
 *
 * Deriving them removes the possibility: the shop is open when a barber is
 * working, it opens when the first one starts and closes when the last one
 * finishes. One source of truth, no synchronisation to forget.
 */
const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

const SHORT_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export async function openingHours(): Promise<DayHours[]> {
  const rows = await prisma.workingHours.findMany({
    where: { isClosed: false, barber: { isActive: true } },
    select: { dayOfWeek: true, opensAtMinutes: true, closesAtMinutes: true },
  });

  return DAY_NAMES.map((day, dayOfWeek) => {
    const forDay = rows.filter((r) => r.dayOfWeek === dayOfWeek);
    if (forDay.length === 0) {
      return { day, short: SHORT_NAMES[dayOfWeek], opens: null, closes: null };
    }
    return {
      day,
      short: SHORT_NAMES[dayOfWeek],
      opens: Math.min(...forDay.map((r) => r.opensAtMinutes)),
      closes: Math.max(...forDay.map((r) => r.closesAtMinutes)),
    };
  });
}
