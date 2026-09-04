import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { clearAppointments, hasDatabase } from "@/lib/db/test-helpers";
import { prisma } from "@/lib/db/client";
import { slotsForAnyBarber, slotsForBarber } from "./query";

/**
 * Exercises the seeded database end to end: rows in, real slots out.
 *
 * The pure engine is covered exhaustively in engine.test.ts; this checks the
 * translation layer — that hours, services and holds are read correctly and
 * handed over in the shape the engine expects.
 */
const suite = hasDatabase ? describe : describe.skip;

// A Tuesday, comfortably inside the booking horizon.
const DATE = "2026-09-15";
const NOW = new Date("2026-09-14T12:00:00Z");

suite("slotsForBarber", () => {
  beforeAll(async () => {
    await clearAppointments();
  });
  afterAll(async () => {
    await clearAppointments();
    await prisma.$disconnect();
  });

  it("returns slots for a seeded barber and service", async () => {
    const slots = await slotsForBarber("eduardo", "adult-haircut", DATE, NOW);
    expect(slots.length).toBeGreaterThan(0);
    // Shop opens 10:30 local; first slot must not precede it.
    expect(slots[0].startMinutes).toBeGreaterThanOrEqual(630);
  });

  it("returns nothing for an unknown barber or service", async () => {
    expect(await slotsForBarber("nobody", "adult-haircut", DATE, NOW)).toEqual([]);
    expect(await slotsForBarber("eduardo", "nothing", DATE, NOW)).toEqual([]);
  });

  it("gives a longer service fewer slots than a shorter one", async () => {
    const short = await slotsForBarber("eduardo", "kids-haircut", DATE, NOW);
    const long = await slotsForBarber("eduardo", "adult-haircut", DATE, NOW);
    expect(long.length).toBeLessThan(short.length);
  });

  it("offers every chair the same times before anything is booked", async () => {
    const merged = await slotsForAnyBarber("adult-haircut", DATE, NOW);
    expect(merged.length).toBeGreaterThan(0);
    expect(merged[0].barberIds.length).toBe(4);
  });
});
