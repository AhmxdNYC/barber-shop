import { fromZonedTime } from "date-fns-tz";

/**
 * Slot generation.
 *
 * Deliberately pure: no database, no clock of its own, no Prisma types. All
 * state arrives as arguments, which is what makes the awkward cases —
 * daylight saving, buffers straddling a block, leads times — testable
 * without standing up Postgres.
 *
 * Everything crossing this boundary is UTC. Shop-local wall-clock times
 * (opening hours, blocks) are stored as minutes from midnight and converted
 * against the shop timezone here, because a shop-local 10:30am is not a
 * fixed UTC offset across a DST boundary.
 */

export type Interval = { start: Date; end: Date };

export type DayHours = {
  opensAtMinutes: number;
  closesAtMinutes: number;
  isClosed: boolean;
};

export type MinuteBlock = {
  startAtMinutes: number;
  endAtMinutes: number;
};

export type EngineSettings = {
  timezone: string;
  /** Granularity of bookable start times. */
  slotIntervalMinutes: number;
  /** Cleanup time reserved after a cut, not shown to the client. */
  bufferMinutes: number;
  /** No bookings sooner than this from now. */
  minLeadTimeMinutes: number;
  /** No bookings further out than this. */
  maxAdvanceDays: number;
};

export type SlotQuery = {
  /** Calendar date in the shop's timezone, "YYYY-MM-DD". */
  date: string;
  durationMinutes: number;
  /** Resolved hours for that date — a DateOverride if one exists, else the weekly template. */
  hours: DayHours | null;
  /** Booked appointments and time off, as UTC instants. */
  busy: Interval[];
  /** Recurring shop-local blocks for that weekday, e.g. lunch. */
  blocks: MinuteBlock[];
  settings: EngineSettings;
  now: Date;
};

export type Slot = {
  /** UTC instant the appointment starts. */
  start: Date;
  /** UTC instant the chair is free again, buffer included. */
  end: Date;
  /** Shop-local minutes from midnight, for display. */
  startMinutes: number;
};

/** Half-open overlap: touching intervals do not collide. */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Converts a shop-local wall-clock time into a UTC instant.
 *
 * Minutes may exceed 1440 (a shop closing after midnight); the date rolls
 * forward accordingly. Conversion happens through the timezone rather than
 * a fixed offset, so the same 10:30am maps to different UTC instants either
 * side of a DST change.
 */
export function localMinutesToUtc(
  date: string,
  minutes: number,
  timezone: string,
): Date {
  const [y, m, d] = date.split("-").map(Number);
  const dayShift = Math.floor(minutes / 1440);
  const within = ((minutes % 1440) + 1440) % 1440;

  const base = new Date(Date.UTC(y, m - 1, d + dayShift));
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(base.getUTCDate()).padStart(2, "0");
  const hh = String(Math.floor(within / 60)).padStart(2, "0");
  const mi = String(within % 60).padStart(2, "0");

  return fromZonedTime(`${yy}-${mm}-${dd}T${hh}:${mi}:00`, timezone);
}

/**
 * Every bookable start time for one barber on one date.
 *
 * A slot survives only if the chair is free for the whole service *and* its
 * cleanup buffer. The buffer is deliberately part of the occupied interval
 * rather than a gap between slots: two back-to-back cuts must not leave the
 * barber with no time to sweep up.
 */
export function generateSlots(query: SlotQuery): Slot[] {
  const { date, durationMinutes, hours, busy, blocks, settings, now } = query;

  if (!hours || hours.isClosed) return [];
  if (durationMinutes <= 0) return [];
  if (hours.closesAtMinutes <= hours.opensAtMinutes) return [];

  const { timezone, slotIntervalMinutes, bufferMinutes } = settings;
  if (slotIntervalMinutes <= 0) return [];

  const earliest = new Date(
    now.getTime() + settings.minLeadTimeMinutes * 60_000,
  );
  const horizon = new Date(
    now.getTime() + settings.maxAdvanceDays * 24 * 60 * 60_000,
  );

  // Recurring shop-local blocks become UTC intervals for this date.
  const blockIntervals: Interval[] = blocks.map((b) => ({
    start: localMinutesToUtc(date, b.startAtMinutes, timezone),
    end: localMinutesToUtc(date, b.endAtMinutes, timezone),
  }));
  const occupied = [...busy, ...blockIntervals];

  const slots: Slot[] = [];

  for (
    let minute = hours.opensAtMinutes;
    minute + durationMinutes <= hours.closesAtMinutes;
    minute += slotIntervalMinutes
  ) {
    const start = localMinutesToUtc(date, minute, timezone);
    // The buffer holds the chair but is not part of the client's appointment.
    const heldUntil = new Date(
      start.getTime() + (durationMinutes + bufferMinutes) * 60_000,
    );

    if (start < earliest) continue;
    if (start > horizon) continue;

    const candidate = { start, end: heldUntil };
    if (occupied.some((o) => overlaps(candidate, o))) continue;

    slots.push({
      start,
      end: heldUntil,
      startMinutes: minute,
    });
  }

  return slots;
}

/**
 * "First available" across several barbers.
 *
 * Returns each distinct start time once, with the barbers who can take it,
 * so the UI can offer a time before making anyone choose a person.
 */
export function mergeSlotsAcrossBarbers(
  perBarber: { barberId: string; slots: Slot[] }[],
): { start: Date; startMinutes: number; barberIds: string[] }[] {
  const byInstant = new Map<
    number,
    { start: Date; startMinutes: number; barberIds: string[] }
  >();

  for (const { barberId, slots } of perBarber) {
    for (const slot of slots) {
      const key = slot.start.getTime();
      const existing = byInstant.get(key);
      if (existing) {
        if (!existing.barberIds.includes(barberId)) {
          existing.barberIds.push(barberId);
        }
      } else {
        byInstant.set(key, {
          start: slot.start,
          startMinutes: slot.startMinutes,
          barberIds: [barberId],
        });
      }
    }
  }

  return [...byInstant.values()].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
}
