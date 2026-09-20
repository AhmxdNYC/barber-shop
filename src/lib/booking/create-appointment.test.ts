import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { clearAppointments, hasDatabase } from "@/lib/db/test-helpers";
import { slotsForBarber } from "@/lib/availability/query";
import { createAppointment } from "./create-appointment";

const suite = hasDatabase ? describe : describe.skip;

/**
 * A real open day, found rather than written down.
 *
 * This was a fixed date inside the booking horizon, which is a horizon that
 * moves: the date arrived, then passed, and every test here failed at once
 * on a morning when nothing had been changed. Anything that depends on a
 * date being in the future has to be told what day it is.
 */
let DATE = "";

suite("createAppointment", () => {
  beforeAll(async () => {
    // Far enough out to clear lead time, near enough to stay inside the
    // maximum advance, and scanning because the shop is not open every day.
    for (let ahead = 3; ahead <= 30 && !DATE; ahead += 1) {
      const day = new Date();
      day.setUTCDate(day.getUTCDate() + ahead);
      const key = day.toISOString().slice(0, 10);
      const slots = await slotsForBarber("eduardo", "adult-haircut", key);
      if (slots.length >= 4) DATE = key;
    }
    if (!DATE) throw new Error("No open day within a month — check the seed.");
  });

  beforeEach(async () => {
    await clearAppointments();
    await prisma.client.deleteMany({ where: { email: { contains: "@booking-test" } } });
  });

  afterAll(async () => {
    await clearAppointments();
    await prisma.client.deleteMany({ where: { email: { contains: "@booking-test" } } });
    await prisma.$disconnect();
  });

  async function firstOpenSlot() {
    const slots = await slotsForBarber("eduardo", "adult-haircut", DATE);
    return slots[0];
  }

  const booking = (start: string, email = "one@booking-test.com") => ({
    barberSlug: "eduardo",
    serviceSlug: "adult-haircut",
    start,
    name: "Test Client",
    email,
    phone: "914-555-0100",
  });

  it("writes an appointment and creates the client", async () => {
    const slot = await firstOpenSlot();
    const result = await createAppointment(booking(slot.start.toISOString()));

    expect(result.ok).toBe(true);
    const saved = await prisma.appointment.findFirst({
      include: { client: true, barber: true, service: true },
    });
    expect(saved?.status).toBe("CONFIRMED");
    expect(saved?.barber.slug).toBe("eduardo");
    expect(saved?.client.email).toBe("one@booking-test.com");
  });

  it("snapshots the price so later menu changes cannot rewrite history", async () => {
    const slot = await firstOpenSlot();
    await createAppointment(booking(slot.start.toISOString()));
    const service = await prisma.service.findUnique({ where: { slug: "adult-haircut" } });
    const saved = await prisma.appointment.findFirst();
    expect(saved?.priceCents).toBe(service?.priceCents);
  });

  it("reserves the cleanup buffer, not just the cut", async () => {
    const slot = await firstOpenSlot();
    await createAppointment(booking(slot.start.toISOString()));
    const [saved, settings, service] = await Promise.all([
      prisma.appointment.findFirst(),
      prisma.shopSettings.findUnique({ where: { id: 1 } }),
      prisma.service.findUnique({ where: { slug: "adult-haircut" } }),
    ]);
    const heldMinutes =
      (saved!.endsAt.getTime() - saved!.startsAt.getTime()) / 60_000;
    expect(heldMinutes).toBe(service!.durationMinutes + settings!.bufferMinutes);
  });

  it("removes the slot from availability once booked", async () => {
    const slot = await firstOpenSlot();
    await createAppointment(booking(slot.start.toISOString()));
    const after = await slotsForBarber("eduardo", "adult-haircut", DATE);
    expect(after.some((s) => s.start.getTime() === slot.start.getTime())).toBe(false);
  });

  it("rejects a second booking for the same slot", async () => {
    const slot = await firstOpenSlot();
    await createAppointment(booking(slot.start.toISOString()));
    const second = await createAppointment(
      booking(slot.start.toISOString(), "two@booking-test.com"),
    );
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe("slot_taken");
  });

  /**
   * The race the exclusion constraint exists for: both requests check
   * availability, both see the slot free, both write.
   */
  it("survives two simultaneous bookings, letting exactly one win", async () => {
    const slot = await firstOpenSlot();
    const results = await Promise.all([
      createAppointment(booking(slot.start.toISOString(), "a@booking-test.com")),
      createAppointment(booking(slot.start.toISOString(), "b@booking-test.com")),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(await prisma.appointment.count()).toBe(1);
  });

  it("refuses a time the shop does not offer", async () => {
    // 3am — well outside opening hours.
    const result = await createAppointment(booking(`${DATE}T07:00:00.000Z`));
    expect(result.ok).toBe(false);
  });

  it("reuses the client row when the same email books again", async () => {
    const slots = await slotsForBarber("eduardo", "adult-haircut", DATE);
    await createAppointment(booking(slots[0].start.toISOString()));

    // Re-query rather than picking another index from the original list: a
    // 45-minute cut plus its buffer spans several slots, so the next few
    // entries now overlap the booking just made.
    const remaining = await slotsForBarber("eduardo", "adult-haircut", DATE);
    await createAppointment(booking(remaining[0].start.toISOString()));
    const clients = await prisma.client.findMany({
      where: { email: "one@booking-test.com" },
    });
    expect(clients).toHaveLength(1);
    expect(await prisma.appointment.count()).toBe(2);
  });
});
