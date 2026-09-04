import "server-only";
import { prisma } from "@/lib/db/client";
import { generateSlots, mergeSlotsAcrossBarbers, type EngineSettings, type Slot } from "./engine";

/**
 * The database side of availability.
 *
 * This module does the fetching; `engine.ts` does the thinking. Keeping them
 * apart is what lets the awkward logic — daylight saving, buffers, lead
 * times — be tested without a database, and it means this file stays a thin,
 * obvious translation from rows to engine inputs.
 */

/** Start of the shop-local day, as a UTC window wide enough to catch every row. */
function utcWindowForDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  // A day is never more than 26 hours wide in any timezone, so pad generously
  // and let the engine do the exact overlap maths.
  const from = new Date(Date.UTC(y, m - 1, d - 1));
  const to = new Date(Date.UTC(y, m - 1, d + 2));
  return { from, to };
}

async function loadSettings(): Promise<EngineSettings> {
  const s = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  if (!s) throw new Error("ShopSettings row is missing — run npm run db:seed.");
  return {
    timezone: s.timezone,
    slotIntervalMinutes: s.slotIntervalMinutes,
    bufferMinutes: s.bufferMinutes,
    minLeadTimeMinutes: s.minLeadTimeMinutes,
    maxAdvanceDays: s.maxAdvanceDays,
  };
}

/**
 * Open slots for one barber on one date.
 *
 * Expired holds are excluded here rather than swept by a cron job, so an
 * abandoned checkout releases its slot the moment anyone next looks.
 */
export async function slotsForBarber(
  barberSlug: string,
  serviceSlug: string,
  date: string,
  now: Date = new Date(),
): Promise<Slot[]> {
  const [settings, barber, service] = await Promise.all([
    loadSettings(),
    prisma.barber.findUnique({ where: { slug: barberSlug } }),
    prisma.service.findUnique({ where: { slug: serviceSlug } }),
  ]);
  if (!barber || !barber.isActive || !service || !service.isActive) return [];

  const [y, m, d] = date.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const { from, to } = utcWindowForDate(date);

  const [weekly, override, blocks, appointments, timeOff] = await Promise.all([
    prisma.workingHours.findUnique({
      where: { barberId_dayOfWeek: { barberId: barber.id, dayOfWeek } },
    }),
    prisma.dateOverride.findUnique({
      where: { barberId_date: { barberId: barber.id, date: new Date(`${date}T00:00:00Z`) } },
    }),
    prisma.recurringBlock.findMany({
      where: { barberId: barber.id, dayOfWeek, isActive: true },
    }),
    prisma.appointment.findMany({
      where: {
        barberId: barber.id,
        startsAt: { gte: from, lt: to },
        OR: [
          { status: { in: ["CONFIRMED", "COMPLETED"] } },
          // An unpaid hold occupies the slot only until it expires.
          { status: "PENDING_PAYMENT", holdExpiresAt: { gt: now } },
        ],
      },
      select: { startsAt: true, endsAt: true },
    }),
    prisma.timeOff.findMany({
      where: { barberId: barber.id, startsAt: { lt: to }, endsAt: { gt: from } },
      select: { startsAt: true, endsAt: true },
    }),
  ]);

  // A DateOverride replaces the weekly template for that date only.
  const hours = override
    ? {
        opensAtMinutes: override.opensAtMinutes ?? weekly?.opensAtMinutes ?? 0,
        closesAtMinutes: override.closesAtMinutes ?? weekly?.closesAtMinutes ?? 0,
        isClosed: override.isClosed,
      }
    : weekly
      ? {
          opensAtMinutes: weekly.opensAtMinutes,
          closesAtMinutes: weekly.closesAtMinutes,
          isClosed: weekly.isClosed,
        }
      : null;

  return generateSlots({
    date,
    durationMinutes: service.durationMinutes,
    hours,
    busy: [...appointments, ...timeOff].map((r) => ({
      start: r.startsAt,
      end: r.endsAt,
    })),
    blocks: blocks.map((b) => ({
      startAtMinutes: b.startAtMinutes,
      endAtMinutes: b.endAtMinutes,
    })),
    settings,
    now,
  });
}

/** Open slots across every active barber, for the "first available" option. */
export async function slotsForAnyBarber(
  serviceSlug: string,
  date: string,
  now: Date = new Date(),
) {
  const barbers = await prisma.barber.findMany({
    where: { isActive: true },
    select: { id: true, slug: true },
    orderBy: { sortOrder: "asc" },
  });

  const perBarber = await Promise.all(
    barbers.map(async (b) => ({
      barberId: b.slug,
      slots: await slotsForBarber(b.slug, serviceSlug, date, now),
    })),
  );

  return mergeSlotsAcrossBarbers(perBarber);
}
