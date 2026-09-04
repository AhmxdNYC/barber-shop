import "server-only";
import { prisma } from "@/lib/db/client";

/**
 * The client book.
 *
 * A flat list of names answers "who are my clients", which is not a question
 * a barber has. The one he does have is "who haven't I seen in a while" —
 * a regular who is two weeks past his usual gap and not booked in is the
 * most useful row on the page, and an alphabetical table buries him.
 *
 * So each client carries their rhythm: how often they come, how long it has
 * been, and whether they are already booked.
 */

export type ClientSummary = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  notes: string | null;
  visitCount: number;
  noShowCount: number;
  totalSpentCents: number;
  lastVisitAt: Date | null;
  daysSinceLastVisit: number | null;
  /** Mean days between visits, once there are at least two. */
  averageGapDays: number | null;
  usualService: string | null;
  usualBarber: string | null;
  nextAppointmentAt: Date | null;
  /** Past their usual gap, with nothing booked. */
  isDue: boolean;
};

const DAY = 24 * 60 * 60 * 1000;

/** Tolerance before calling someone overdue, so a few days late is not a flag. */
const DUE_TOLERANCE = 1.15;

function daysBetween(a: Date, b: Date): number {
  return Math.round(Math.abs(a.getTime() - b.getTime()) / DAY);
}

/** Mean interval between consecutive visits. Null below two visits. */
function averageGap(visits: Date[]): number | null {
  if (visits.length < 2) return null;
  const sorted = [...visits].sort((a, b) => a.getTime() - b.getTime());
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += daysBetween(sorted[i], sorted[i - 1]);
  }
  return Math.round(total / (sorted.length - 1));
}

/** The value appearing most often, for "what they always get". */
function mostCommon(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

export async function clientBook(): Promise<ClientSummary[]> {
  const now = new Date();

  const clients = await prisma.client.findMany({
    orderBy: [{ lastVisitAt: "desc" }, { createdAt: "desc" }],
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
      appointments: {
        select: {
          startsAt: true,
          status: true,
          service: { select: { name: true } },
          barber: { select: { name: true } },
        },
        orderBy: { startsAt: "desc" },
        // Enough history for a stable rhythm without loading years of it.
        take: 20,
      },
    },
  });

  return clients.map((client) => {
    const completed = client.appointments.filter((a) => a.status === "COMPLETED");
    const upcoming = client.appointments
      .filter((a) => a.status === "CONFIRMED" && a.startsAt > now)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

    const gap = averageGap(completed.map((a) => a.startsAt));
    const daysSince = client.lastVisitAt ? daysBetween(now, client.lastVisitAt) : null;

    return {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      notes: client.notes,
      visitCount: client.visitCount,
      noShowCount: client.noShowCount,
      totalSpentCents: client.totalSpentCents,
      lastVisitAt: client.lastVisitAt,
      daysSinceLastVisit: daysSince,
      averageGapDays: gap,
      usualService: mostCommon(completed.map((a) => a.service.name)),
      usualBarber: mostCommon(completed.map((a) => a.barber.name)),
      nextAppointmentAt: upcoming[0]?.startsAt ?? null,
      isDue:
        upcoming.length === 0 &&
        gap !== null &&
        daysSince !== null &&
        daysSince > gap * DUE_TOLERANCE,
    };
  });
}

/** One client, with their full history for the detail page. */
export async function clientDetail(id: string) {
  const client = await prisma.client.findUnique({
    where: { id },
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
      createdAt: true,
      appointments: {
        orderBy: { startsAt: "desc" },
        select: {
          id: true,
          startsAt: true,
          status: true,
          priceCents: true,
          clientNotes: true,
          barberNotes: true,
          service: { select: { name: true } },
          barber: { select: { name: true } },
        },
      },
    },
  });
  if (!client) return null;

  const completed = client.appointments.filter((a) => a.status === "COMPLETED");
  return {
    ...client,
    averageGapDays: averageGap(completed.map((a) => a.startsAt)),
    daysSinceLastVisit: client.lastVisitAt
      ? daysBetween(new Date(), client.lastVisitAt)
      : null,
  };
}
