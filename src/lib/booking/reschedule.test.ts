import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { clearAppointments, hasDatabase } from "@/lib/db/test-helpers";
import { slotsForBarber } from "@/lib/availability/query";
import { createAppointment } from "./create-appointment";
import { rescheduleAppointment } from "./reschedule";

const suite = hasDatabase ? describe : describe.skip;
const EMAIL = "reschedule@booking-test.com";

suite("rescheduleAppointment", () => {
  beforeEach(async () => {
    await clearAppointments();
    await prisma.client.deleteMany({ where: { email: EMAIL } });
  });

  afterAll(async () => {
    await clearAppointments();
    await prisma.client.deleteMany({ where: { email: EMAIL } });
    await prisma.$disconnect();
  });

  function date() {
    return new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  }

  async function bookFirst() {
    const slots = await slotsForBarber("eduardo", "adult-haircut", date());
    if (slots.length < 6) return null;
    const result = await createAppointment({
      barberSlug: "eduardo",
      serviceSlug: "adult-haircut",
      start: slots[0].start.toISOString(),
      name: "Reschedule Test",
      email: EMAIL,
      phone: "914-555-0100",
    });
    const saved = await prisma.appointment.findFirst();
    return { result, saved: saved!, slots };
  }

  it("moves the appointment and keeps the same row", async () => {
    const booked = await bookFirst();
    if (!booked) return;

    const target = booked.slots[5];
    const outcome = await rescheduleAppointment(booked.saved.id, target.start);
    expect(outcome.ok).toBe(true);

    const after = await prisma.appointment.findUnique({
      where: { id: booked.saved.id },
    });
    // Same appointment, new time — not a cancel and rebook.
    expect(after?.startsAt.getTime()).toBe(target.start.getTime());
    expect(await prisma.appointment.count()).toBe(1);
  });

  it("keeps the manage token working after a move", async () => {
    const booked = await bookFirst();
    if (!booked) return;

    const before = booked.saved.manageTokenHash;
    await rescheduleAppointment(booked.saved.id, booked.slots[5].start);
    const after = await prisma.appointment.findUnique({
      where: { id: booked.saved.id },
      select: { manageTokenHash: true },
    });
    expect(after?.manageTokenHash).toBe(before);
  });

  it("frees the original slot", async () => {
    const booked = await bookFirst();
    if (!booked) return;

    const original = booked.slots[0].start;
    await rescheduleAppointment(booked.saved.id, booked.slots[5].start);

    const now = await slotsForBarber("eduardo", "adult-haircut", date());
    expect(now.some((s) => s.start.getTime() === original.getTime())).toBe(true);
  });

  /**
   * The reason this is an update rather than cancel-then-rebook: a rejected
   * move must leave the original booking intact, not destroyed.
   */
  it("leaves the booking untouched when the new time is unavailable", async () => {
    const booked = await bookFirst();
    if (!booked) return;

    const outcome = await rescheduleAppointment(
      booked.saved.id,
      new Date(`${date()}T07:00:00.000Z`), // outside opening hours
    );
    expect(outcome.ok).toBe(false);

    const after = await prisma.appointment.findUnique({
      where: { id: booked.saved.id },
    });
    expect(after?.startsAt.getTime()).toBe(booked.saved.startsAt.getTime());
    expect(after?.status).toBe("CONFIRMED");
  });

  it("refuses to move a cancelled booking", async () => {
    const booked = await bookFirst();
    if (!booked) return;
    await prisma.appointment.update({
      where: { id: booked.saved.id },
      data: { status: "CANCELLED" },
    });
    const outcome = await rescheduleAppointment(booked.saved.id, booked.slots[5].start);
    expect(outcome.ok).toBe(false);
  });
});
