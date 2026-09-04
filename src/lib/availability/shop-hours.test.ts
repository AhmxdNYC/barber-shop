import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { clearAppointments, hasDatabase } from "@/lib/db/test-helpers";
import { slotsForBarber } from "./query";

/**
 * The shop's hours are the outer boundary.
 *
 * A barber's own schedule can only ever narrow what is bookable, never widen
 * it. Without this, closing the shop for a day would mean editing every
 * chair separately and missing one would quietly leave the shop bookable.
 */
const suite = hasDatabase ? describe : describe.skip;

/** A Tuesday inside the booking horizon. */
const DATE = "2026-09-15";
const NOW = new Date("2026-09-14T12:00:00Z");
const TUESDAY = 2;

suite("shop hours constrain availability", () => {
  afterEach(async () => {
    await clearAppointments();
    // Restore the seeded Tuesday.
    await prisma.shopHours.update({
      where: { dayOfWeek: TUESDAY },
      data: { opensAtMinutes: 630, closesAtMinutes: 1170, isClosed: false },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("offers nothing when the shop is closed, even if a barber is working", async () => {
    const barberStillWorking = await prisma.workingHours.findFirst({
      where: { dayOfWeek: TUESDAY, isClosed: false },
    });
    expect(barberStillWorking).not.toBeNull();

    await prisma.shopHours.update({
      where: { dayOfWeek: TUESDAY },
      data: { isClosed: true },
    });

    expect(await slotsForBarber("eduardo", "adult-haircut", DATE, NOW)).toEqual([]);
  });

  it("clips a barber's day to the shop's closing time", async () => {
    await prisma.shopHours.update({
      where: { dayOfWeek: TUESDAY },
      data: { opensAtMinutes: 630, closesAtMinutes: 780 }, // shuts at 1pm
    });

    const slots = await slotsForBarber("eduardo", "adult-haircut", DATE, NOW);
    expect(slots.length).toBeGreaterThan(0);
    // A 30-minute cut must be finished by 1pm.
    expect(Math.max(...slots.map((s) => s.startMinutes))).toBeLessThanOrEqual(750);
  });

  it("clips a barber's day to the shop's opening time", async () => {
    await prisma.shopHours.update({
      where: { dayOfWeek: TUESDAY },
      data: { opensAtMinutes: 840, closesAtMinutes: 1170 }, // opens at 2pm
    });

    const slots = await slotsForBarber("eduardo", "adult-haircut", DATE, NOW);
    expect(slots.length).toBeGreaterThan(0);
    expect(Math.min(...slots.map((s) => s.startMinutes))).toBeGreaterThanOrEqual(840);
  });

  it("offers nothing when shop and barber hours do not overlap", async () => {
    await prisma.shopHours.update({
      where: { dayOfWeek: TUESDAY },
      data: { opensAtMinutes: 0, closesAtMinutes: 300 }, // shut before anyone starts
    });

    expect(await slotsForBarber("eduardo", "adult-haircut", DATE, NOW)).toEqual([]);
  });
});
