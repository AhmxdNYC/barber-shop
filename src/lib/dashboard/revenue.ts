import "server-only";
import { prisma } from "@/lib/db/client";

/**
 * What the shop actually took.
 *
 * Counts completed appointments only. Booked revenue would flatter every
 * number on the page, and the moment a barber notices the total does not
 * match his till he stops trusting the whole dashboard — which is worse than
 * not showing him money at all.
 *
 * Cancellations and no-shows are excluded from earnings but reported
 * separately, because "what did I lose" is a real question and burying it
 * inside a single figure answers neither.
 */

const DAY = 24 * 60 * 60 * 1000;

export type RevenuePoint = {
  /** Local date key, "YYYY-MM-DD". */
  date: string;
  label: string;
  cents: number;
  cuts: number;
};

export type RevenueReport = {
  days: number;
  totalCents: number;
  cuts: number;
  averageCents: number;
  busiestDay: RevenuePoint | null;
  daily: RevenuePoint[];
  byService: { name: string; cents: number; cuts: number }[];
  byBarber: { name: string; cents: number; cuts: number }[];
  noShowCount: number;
  /** What the no-shows would have been worth, had they turned up. */
  noShowCents: number;
  cancelledCount: number;
  /** The same window ending one period earlier, for comparison. */
  previousTotalCents: number;
};

export async function revenueReport(
  days: number,
  timeZone: string,
): Promise<RevenueReport> {
  const now = new Date();
  const from = new Date(now.getTime() - days * DAY);
  const previousFrom = new Date(from.getTime() - days * DAY);

  const [completed, previous, noShows, cancelled] = await Promise.all([
    prisma.appointment.findMany({
      where: { status: "COMPLETED", startsAt: { gte: from, lte: now } },
      select: {
        startsAt: true,
        priceCents: true,
        service: { select: { name: true } },
        barber: { select: { name: true } },
      },
    }),
    prisma.appointment.aggregate({
      where: { status: "COMPLETED", startsAt: { gte: previousFrom, lt: from } },
      _sum: { priceCents: true },
    }),
    prisma.appointment.findMany({
      where: { status: "NO_SHOW", startsAt: { gte: from, lte: now } },
      select: { priceCents: true },
    }),
    prisma.appointment.count({
      where: { status: "CANCELLED", startsAt: { gte: from, lte: now } },
    }),
  ]);

  const dateKey = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d);

  // Every day in the window, so quiet days show as gaps rather than vanishing.
  const daily: RevenuePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY);
    daily.push({
      date: dateKey(d),
      label: new Intl.DateTimeFormat("en-US", {
        timeZone, weekday: "short", day: "numeric",
      }).format(d),
      cents: 0,
      cuts: 0,
    });
  }
  const byDate = new Map(daily.map((p) => [p.date, p]));

  const services = new Map<string, { cents: number; cuts: number }>();
  const barbers = new Map<string, { cents: number; cuts: number }>();

  for (const appointment of completed) {
    const point = byDate.get(dateKey(appointment.startsAt));
    if (point) {
      point.cents += appointment.priceCents;
      point.cuts += 1;
    }

    const service = services.get(appointment.service.name) ?? { cents: 0, cuts: 0 };
    service.cents += appointment.priceCents;
    service.cuts += 1;
    services.set(appointment.service.name, service);

    const barber = barbers.get(appointment.barber.name) ?? { cents: 0, cuts: 0 };
    barber.cents += appointment.priceCents;
    barber.cuts += 1;
    barbers.set(appointment.barber.name, barber);
  }

  const totalCents = completed.reduce((sum, a) => sum + a.priceCents, 0);
  const withEarnings = daily.filter((d) => d.cuts > 0);

  return {
    days,
    totalCents,
    cuts: completed.length,
    averageCents: completed.length ? Math.round(totalCents / completed.length) : 0,
    busiestDay:
      withEarnings.length > 0
        ? withEarnings.reduce((best, d) => (d.cents > best.cents ? d : best))
        : null,
    daily,
    byService: [...services.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.cents - a.cents),
    byBarber: [...barbers.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.cents - a.cents),
    noShowCount: noShows.length,
    noShowCents: noShows.reduce((sum, a) => sum + a.priceCents, 0),
    cancelledCount: cancelled,
    previousTotalCents: previous._sum.priceCents ?? 0,
  };
}
