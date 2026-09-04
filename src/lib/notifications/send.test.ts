import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { clearAppointments, hasDatabase } from "@/lib/db/test-helpers";
import { slotsForBarber } from "@/lib/availability/query";
import { createAppointment } from "@/lib/booking/create-appointment";

/**
 * The outbox.
 *
 * Every send writes a row whether it worked or not, so a lost message is a
 * visible record rather than a line in a log nobody reads. That matters most
 * for the confirmation, because it carries the only cancellation link a
 * guest ever receives.
 */
const suite = hasDatabase ? describe : describe.skip;
const EMAIL = "notify@booking-test.com";

suite("notification outbox", () => {
  beforeEach(async () => {
    await clearAppointments();
    await prisma.client.deleteMany({ where: { email: EMAIL } });
  });

  afterAll(async () => {
    await clearAppointments();
    await prisma.client.deleteMany({ where: { email: EMAIL } });
    await prisma.$disconnect();
  });

  async function book() {
    const date = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
    const slots = await slotsForBarber("eduardo", "adult-haircut", date);
    if (slots.length === 0) return null;
    return createAppointment({
      barberSlug: "eduardo",
      serviceSlug: "adult-haircut",
      start: slots[0].start.toISOString(),
      name: "Notify Test",
      email: EMAIL,
      phone: "914-555-0100",
    });
  }

  it("records a confirmation for every booking", async () => {
    const result = await book();
    if (!result) return;
    expect(result.ok).toBe(true);

    const notifications = await prisma.notification.findMany();
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe("BOOKING_CONFIRMED");
    expect(notifications[0].recipient).toBe(EMAIL);
    expect(notifications[0].status).toBe("SENT");
  });

  it("links the notification to its appointment", async () => {
    if (!(await book())) return;
    const notification = await prisma.notification.findFirst({
      include: { appointment: true },
    });
    expect(notification?.appointment?.contactEmail).toBe(EMAIL);
  });

  /**
   * The booking is the thing that matters; the email is a courtesy. A
   * provider having a bad minute must never turn a successful booking into
   * a failure the client sees.
   */
  it("does not fail the booking when delivery fails", async () => {
    const original = process.env.RESEND_API_KEY;
    const originalFrom = process.env.EMAIL_FROM;
    // Force the Resend transport with a key that cannot work.
    process.env.RESEND_API_KEY = "re_invalid_key_for_test";
    process.env.EMAIL_FROM = "test@example.com";

    try {
      const result = await book();
      if (!result) return;
      expect(result.ok).toBe(true);

      const notification = await prisma.notification.findFirst();
      expect(notification?.status).toBe("FAILED");
      expect(notification?.error).toBeTruthy();
    } finally {
      process.env.RESEND_API_KEY = original;
      process.env.EMAIL_FROM = originalFrom;
    }
  });
});
