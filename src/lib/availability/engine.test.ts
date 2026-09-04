import { describe, expect, it } from "vitest";
import {
  generateSlots,
  localMinutesToUtc,
  mergeSlotsAcrossBarbers,
  overlaps,
  type EngineSettings,
  type SlotQuery,
} from "./engine";

const TZ = "America/New_York";

const settings: EngineSettings = {
  timezone: TZ,
  slotIntervalMinutes: 30,
  bufferMinutes: 10,
  minLeadTimeMinutes: 0,
  maxAdvanceDays: 60,
};

/** Shop open 10:00–13:00 local, so slot maths stays readable. */
const hours = { opensAtMinutes: 600, closesAtMinutes: 780, isClosed: false };

function query(over: Partial<SlotQuery> = {}): SlotQuery {
  return {
    date: "2026-09-15",
    durationMinutes: 30,
    hours,
    busy: [],
    blocks: [],
    settings,
    // Well before the date under test, so lead time never interferes.
    now: new Date("2026-09-01T00:00:00Z"),
    ...over,
  };
}

const at = (date: string, minutes: number) =>
  localMinutesToUtc(date, minutes, TZ);

describe("overlaps", () => {
  it("treats touching intervals as free", () => {
    const a = { start: new Date("2026-09-15T14:00:00Z"), end: new Date("2026-09-15T15:00:00Z") };
    const b = { start: new Date("2026-09-15T15:00:00Z"), end: new Date("2026-09-15T16:00:00Z") };
    expect(overlaps(a, b)).toBe(false);
  });

  it("detects a genuine collision", () => {
    const a = { start: new Date("2026-09-15T14:00:00Z"), end: new Date("2026-09-15T15:00:00Z") };
    const b = { start: new Date("2026-09-15T14:30:00Z"), end: new Date("2026-09-15T15:30:00Z") };
    expect(overlaps(a, b)).toBe(true);
  });
});

describe("generateSlots", () => {
  it("fills the day at the configured interval", () => {
    const slots = generateSlots(query());
    // 10:00 through 12:30 — a 30-minute cut must finish by 13:00.
    expect(slots.map((s) => s.startMinutes)).toEqual([600, 630, 660, 690, 720, 750]);
  });

  it("returns nothing when the barber is closed", () => {
    expect(generateSlots(query({ hours: { ...hours, isClosed: true } }))).toEqual([]);
    expect(generateSlots(query({ hours: null }))).toEqual([]);
  });

  it("never offers a slot that would run past closing", () => {
    const slots = generateSlots(query({ durationMinutes: 60 }));
    expect(slots.at(-1)?.startMinutes).toBe(720); // 12:00 + 60m = 13:00 exactly
  });

  it("removes slots taken by an existing appointment", () => {
    const busy = [{ start: at("2026-09-15", 660), end: at("2026-09-15", 700) }];
    const slots = generateSlots(query({ busy }));
    expect(slots.map((s) => s.startMinutes)).not.toContain(660);
    expect(slots.map((s) => s.startMinutes)).toContain(600);
  });

  it("reserves the cleanup buffer, not just the cut", () => {
    // A 30-minute cut at 10:00 holds the chair until 10:40 (30 + 10 buffer),
    // so a block starting 10:35 must still kill the 10:00 slot.
    const busy = [{ start: at("2026-09-15", 635), end: at("2026-09-15", 645) }];
    const slots = generateSlots(query({ busy }));
    expect(slots.map((s) => s.startMinutes)).not.toContain(600);
  });

  it("honours recurring blocks like lunch", () => {
    const slots = generateSlots(
      query({ blocks: [{ startAtMinutes: 660, endAtMinutes: 720 }] }),
    );
    expect(slots.map((s) => s.startMinutes)).toEqual([600, 720, 750]);
  });

  it("refuses bookings inside the lead time", () => {
    const slots = generateSlots(
      query({
        now: at("2026-09-15", 600), // 10:00 local on the day itself
        settings: { ...settings, minLeadTimeMinutes: 120 },
      }),
    );
    // Anything before 12:00 local is too soon.
    expect(slots.every((s) => s.startMinutes >= 720)).toBe(true);
  });

  it("refuses bookings beyond the booking horizon", () => {
    const slots = generateSlots(
      query({ settings: { ...settings, maxAdvanceDays: 3 } }),
    );
    expect(slots).toEqual([]);
  });

  it("handles a zero or negative duration without looping forever", () => {
    expect(generateSlots(query({ durationMinutes: 0 }))).toEqual([]);
    expect(generateSlots(query({ durationMinutes: -30 }))).toEqual([]);
  });
});

/**
 * The cases that actually break booking systems. A shop-local 10:00am is
 * 14:00Z in winter and 13:00Z in summer; anything that assumes a fixed
 * offset silently books people an hour out twice a year.
 */
describe("daylight saving", () => {
  it("maps 10:00 local to 15:00Z in EST (winter, UTC-5)", () => {
    expect(at("2026-01-15", 600).toISOString()).toBe("2026-01-15T15:00:00.000Z");
  });

  it("maps 10:00 local to 14:00Z in EDT (summer, UTC-4)", () => {
    expect(at("2026-07-15", 600).toISOString()).toBe("2026-07-15T14:00:00.000Z");
  });

  it("produces the correct UTC instants on the spring-forward day", () => {
    // 2026-03-08: clocks jump 02:00 -> 03:00 local.
    const slots = generateSlots(
      query({ date: "2026-03-08", now: new Date("2026-03-01T00:00:00Z") }),
    );
    expect(slots[0].start.toISOString()).toBe("2026-03-08T14:00:00.000Z");
    // Consecutive slots stay exactly one interval apart in real time.
    const gap = slots[1].start.getTime() - slots[0].start.getTime();
    expect(gap).toBe(30 * 60_000);
  });

  it("produces the correct UTC instants on the fall-back day", () => {
    // 2026-11-01: clocks fall 02:00 -> 01:00 local.
    const slots = generateSlots(
      query({ date: "2026-11-01", now: new Date("2026-10-25T00:00:00Z") }),
    );
    expect(slots[0].start.toISOString()).toBe("2026-11-01T15:00:00.000Z");
    const gap = slots[1].start.getTime() - slots[0].start.getTime();
    expect(gap).toBe(30 * 60_000);
  });

  it("keeps the same local opening time either side of the change", () => {
    const asOf = new Date("2026-03-01T00:00:00Z");
    const before = generateSlots(query({ date: "2026-03-07", now: asOf }));
    const after = generateSlots(query({ date: "2026-03-09", now: asOf }));
    expect(before[0].startMinutes).toBe(600);
    expect(after[0].startMinutes).toBe(600);
    // Same wall clock, one hour apart in UTC.
    const diff =
      (after[0].start.getTime() - before[0].start.getTime()) / 60_000;
    expect(diff).toBe(2 * 24 * 60 - 60);
  });
});

describe("mergeSlotsAcrossBarbers", () => {
  it("collapses a shared time into one entry listing both barbers", () => {
    const a = generateSlots(query());
    const b = generateSlots(query());
    const merged = mergeSlotsAcrossBarbers([
      { barberId: "eduardo", slots: a },
      { barberId: "chair-2", slots: b },
    ]);
    expect(merged).toHaveLength(a.length);
    expect(merged[0].barberIds).toEqual(["eduardo", "chair-2"]);
  });

  it("keeps a time only one barber offers, and sorts chronologically", () => {
    const busy = [{ start: at("2026-09-15", 600), end: at("2026-09-15", 640) }];
    const merged = mergeSlotsAcrossBarbers([
      { barberId: "eduardo", slots: generateSlots(query({ busy })) },
      { barberId: "chair-2", slots: generateSlots(query()) },
    ]);
    expect(merged[0].startMinutes).toBe(600);
    expect(merged[0].barberIds).toEqual(["chair-2"]);
    const times = merged.map((m) => m.start.getTime());
    expect(times).toEqual([...times].sort((x, y) => x - y));
  });
});
