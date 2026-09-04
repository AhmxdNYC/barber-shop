import "server-only";
import { prisma } from "@/lib/db/client";
import { dayBounds } from "./queries";

/**
 * Everything that occupies a barber's day, in one shape the calendar can
 * lay out: appointments, repeating breaks and time off.
 *
 * A list of appointments tells the barber what is booked. A calendar tells
 * him what is *free*, which is the question he actually has when someone
 * asks "can you fit me in later?"
 */

export type ScheduleBlock = {
  id: string;
  kind: "appointment" | "break" | "timeoff";
  /** Shop-local minutes from midnight. */
  startMinutes: number;
  endMinutes: number;
  title: string;
  subtitle?: string;
  status?: string;
};

export type BarberDay = {
  barberId: string;
  barberName: string;
  opensAtMinutes: number;
  closesAtMinutes: number;
  isClosed: boolean;
  blocks: ScheduleBlock[];
};

/** Minutes from midnight for an instant, in the shop's timezone. */
function localMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

export async function scheduleForDay(
  date: Date,
  timeZone: string,
): Promise<BarberDay[]> {
  const { start, end } = dayBounds(date);
  const dayOfWeek = date.getDay();

  const barbers = await prisma.barber.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      workingHours: { where: { dayOfWeek } },
      recurringBlocks: { where: { dayOfWeek, isActive: true } },
      timeOff: { where: { startsAt: { lt: end }, endsAt: { gt: start } } },
      appointments: {
        where: { startsAt: { gte: start, lt: end }, status: { not: "CANCELLED" } },
        orderBy: { startsAt: "asc" },
        select: {
          id: true,
          startsAt: true,
          endsAt: true,
          status: true,
          contactName: true,
          service: { select: { name: true } },
        },
      },
    },
  });

  return barbers.map((barber) => {
    const hours = barber.workingHours[0];

    const blocks: ScheduleBlock[] = [
      ...barber.appointments.map((a) => ({
        id: a.id,
        kind: "appointment" as const,
        startMinutes: localMinutes(a.startsAt, timeZone),
        endMinutes: localMinutes(a.endsAt, timeZone),
        title: a.contactName,
        subtitle: a.service.name,
        status: a.status,
      })),
      ...barber.recurringBlocks.map((b) => ({
        id: b.id,
        kind: "break" as const,
        startMinutes: b.startAtMinutes,
        endMinutes: b.endAtMinutes,
        title: b.label,
      })),
      ...barber.timeOff.map((t) => ({
        id: t.id,
        kind: "timeoff" as const,
        // Time off can span days; clamp it to this one for layout.
        startMinutes: t.startsAt < start ? 0 : localMinutes(t.startsAt, timeZone),
        endMinutes: t.endsAt > end ? 24 * 60 : localMinutes(t.endsAt, timeZone),
        title: t.reason ?? "Time off",
      })),
    ].sort((a, b) => a.startMinutes - b.startMinutes);

    return {
      barberId: barber.id,
      barberName: barber.name,
      opensAtMinutes: hours?.opensAtMinutes ?? 600,
      closesAtMinutes: hours?.closesAtMinutes ?? 1200,
      isClosed: hours?.isClosed ?? true,
      blocks,
    };
  });
}

/** Upcoming time off across all barbers, for the "what's coming" panel. */
export async function upcomingTimeOff(limit = 5) {
  return prisma.timeOff.findMany({
    where: { endsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take: limit,
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      reason: true,
      barber: { select: { name: true } },
    },
  });
}
