import "server-only";
import { prisma } from "@/lib/db/client";

/**
 * Read models for the barber dashboard.
 *
 * Each function returns exactly what one panel renders, so pages stay free
 * of query logic and no panel accidentally pulls a client's private notes
 * into a context that does not need them.
 */

/** Start and end of a shop-local day, as UTC instants. */
export function dayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

const APPOINTMENT_FIELDS = {
  id: true,
  startsAt: true,
  endsAt: true,
  status: true,
  source: true,
  priceCents: true,
  depositCents: true,
  contactName: true,
  contactPhone: true,
  clientNotes: true,
  barberNotes: true,
  service: { select: { name: true, durationMinutes: true } },
  barber: { select: { name: true, slug: true } },
  payment: { select: { status: true, amountCents: true } },
  client: { select: { id: true, noShowCount: true, visitCount: true } },
} as const;

export async function appointmentsForDay(date: Date) {
  const { start, end } = dayBounds(date);
  return prisma.appointment.findMany({
    where: { startsAt: { gte: start, lt: end }, status: { not: "CANCELLED" } },
    select: APPOINTMENT_FIELDS,
    orderBy: { startsAt: "asc" },
  });
}

export type DayAppointment = Awaited<ReturnType<typeof appointmentsForDay>>[number];

/**
 * Headline numbers for the day view.
 *
 * Revenue counts completed appointments only. Counting booked revenue would
 * flatter the number, and a dashboard the barber stops trusting is worse
 * than no dashboard.
 */
export async function dayStats(date: Date) {
  const { start, end } = dayBounds(date);
  const weekStart = new Date(start);
  weekStart.setDate(weekStart.getDate() - 6);

  const [booked, completed, noShows, revenue] = await Promise.all([
    prisma.appointment.count({
      where: {
        startsAt: { gte: start, lt: end },
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      },
    }),
    prisma.appointment.count({
      where: { startsAt: { gte: start, lt: end }, status: "COMPLETED" },
    }),
    prisma.appointment.count({
      where: { startsAt: { gte: weekStart, lt: end }, status: "NO_SHOW" },
    }),
    prisma.appointment.aggregate({
      where: { startsAt: { gte: weekStart, lt: end }, status: "COMPLETED" },
      _sum: { priceCents: true },
    }),
  ]);

  return {
    booked,
    completed,
    noShowsThisWeek: noShows,
    revenueThisWeekCents: revenue._sum.priceCents ?? 0,
  };
}

/** Clients ordered by most recent visit. */
export async function recentClients(limit = 50) {
  return prisma.client.findMany({
    orderBy: [{ lastVisitAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      notes: true,
      visitCount: true,
      noShowCount: true,
      totalSpentCents: true,
      lastVisitAt: true,
    },
  });
}
