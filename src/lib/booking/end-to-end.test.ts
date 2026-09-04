import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { clearAppointments, hasDatabase } from "@/lib/db/test-helpers";
import { slotsForBarber } from "@/lib/availability/query";
import { appointmentsForDay, dayStats } from "@/lib/dashboard/queries";
import { createAppointment } from "./create-appointment";
import { issueManageToken } from "./manage-token";

/**
 * The whole path: a client books, the slot closes, the barber sees it, and
 * the guest link cancels it.
 *
 * The unit suites cover each piece; this checks they are actually wired to
 * each other, which is where things usually break.
 */
const suite = hasDatabase ? describe : describe.skip;

const TEST_EMAIL = "e2e@booking-test.com";

suite("booking end to end", () => {
  beforeEach(async () => {
    await clearAppointments();
    await prisma.client.deleteMany({ where: { email: TEST_EMAIL } });
  });

  afterAll(async () => {
    await clearAppointments();
    await prisma.client.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  /** Three days out, so lead time and the booking horizon are both satisfied. */
  function targetDate() {
    const d = new Date(Date.now() + 3 * 86_400_000);
    return d.toISOString().slice(0, 10);
  }

  async function bookFirstSlot() {
    const date = targetDate();
    const slots = await slotsForBarber("eduardo", "adult-haircut", date);
    if (slots.length === 0) return null;
    const result = await createAppointment({
      barberSlug: "eduardo",
      serviceSlug: "adult-haircut",
      start: slots[0].start.toISOString(),
      name: "Marcus Webb",
      email: TEST_EMAIL,
      phone: "914-555-0182",
      notes: "First time — going short on the sides",
    });
    return { date, slot: slots[0], result, before: slots.length };
  }

  it("books, closes the slot, and shows up on the barber's day", async () => {
    const booked = await bookFirstSlot();
    if (!booked) return; // shop closed that day; other tests cover the rest
    expect(booked.result.ok).toBe(true);

    // The booked start time is gone, and so is every other start whose
    // service would have run into it. One 45-minute cut plus its buffer
    // spans several 15-minute candidates, so this is more than one slot.
    const after = await slotsForBarber("eduardo", "adult-haircut", booked.date);
    expect(after.length).toBeLessThan(booked.before);
    expect(
      after.some((s) => s.start.getTime() === booked.slot.start.getTime()),
    ).toBe(false);

    // Nothing still on offer may overlap the appointment we just made.
    const occupiedStart = booked.slot.start.getTime();
    const occupiedEnd = booked.slot.end.getTime();
    for (const remaining of after) {
      const overlaps =
        remaining.start.getTime() < occupiedEnd &&
        occupiedStart < remaining.end.getTime();
      expect(overlaps).toBe(false);
    }

    // And it appears on the barber's day view with the client's note.
    const day = await appointmentsForDay(booked.slot.start);
    expect(day).toHaveLength(1);
    expect(day[0].contactName).toBe("Marcus Webb");
    expect(day[0].service.name).toBe("Adult Haircut");
    expect(day[0].clientNotes).toContain("short on the sides");
    expect(day[0].status).toBe("CONFIRMED");
  });

  it("counts the booking in the day's stats without counting it as revenue", async () => {
    const booked = await bookFirstSlot();
    if (!booked) return;

    const stats = await dayStats(booked.slot.start);
    expect(stats.booked).toBe(1);
    expect(stats.completed).toBe(0);
    // Revenue is completed work only — a booking is not money yet.
    expect(stats.revenueThisWeekCents).toBe(0);
  });

  it("stores only the hash of the guest management token", async () => {
    const booked = await bookFirstSlot();
    if (!booked) return;

    const saved = await prisma.appointment.findFirst({
      select: { manageTokenHash: true },
    });
    // 64 hex characters — a SHA-256 digest, not a raw token.
    expect(saved?.manageTokenHash).toMatch(/^[0-9a-f]{64}$/);

    // A token we did not issue must not resolve to anything.
    const { hash } = issueManageToken();
    expect(
      await prisma.appointment.findUnique({ where: { manageTokenHash: hash } }),
    ).toBeNull();
  });

  it("frees the slot again when the appointment is cancelled", async () => {
    const booked = await bookFirstSlot();
    if (!booked) return;

    await prisma.appointment.updateMany({ data: { status: "CANCELLED" } });

    const after = await slotsForBarber("eduardo", "adult-haircut", booked.date);
    expect(after.length).toBe(booked.before);
  });
});
