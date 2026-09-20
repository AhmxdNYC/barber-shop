import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import {
  barberIdBySlug,
  clearAppointments,
  ensureTestClient,
  hasDatabase,
  serviceIdBySlug,
} from "@/lib/db/test-helpers";
import { confirmPaidAppointment } from "./confirm";

/**
 * Turning a paid hold into a booking.
 *
 * Needs a real database: the interesting case is the one the exclusion
 * constraint decides, where a payment lands for a slot somebody else has
 * since taken. Stripe itself is stubbed — what is worth asserting is that a
 * refund is reached at all, and with the right appointment, not that the
 * Stripe SDK works.
 */
const refunds = vi.fn(async () => ({ id: "re_test_1" }));
vi.mock("./stripe", () => ({
  stripe: () => ({ refunds: { create: refunds } }),
  stripeConfigured: true,
  stripeIsTestMode: true,
  MIN_SESSION_MINUTES: 30,
}));

const suite = hasDatabase ? describe : describe.skip;

suite("confirmPaidAppointment", () => {
  let eduardo: string;
  let serviceId: string;
  let clientId: string;

  beforeAll(async () => {
    [eduardo, serviceId, { id: clientId }] = await Promise.all([
      barberIdBySlug("eduardo"),
      serviceIdBySlug("adult-haircut"),
      ensureTestClient(),
    ]);
  });

  beforeEach(clearAppointments);

  afterAll(async () => {
    await clearAppointments();
    await prisma.$disconnect();
  });

  let seq = 0;
  async function hold(opts: { start: string; end: string; status?: "PENDING_PAYMENT" | "CANCELLED" }) {
    seq += 1;
    const appointment = await prisma.appointment.create({
      data: {
        barberId: eduardo,
        clientId,
        serviceId,
        contactName: "Test",
        contactEmail: "pay-test@example.com",
        startsAt: new Date(`2026-10-06T${opts.start}:00Z`),
        endsAt: new Date(`2026-10-06T${opts.end}:00Z`),
        status: opts.status ?? "PENDING_PAYMENT",
        holdExpiresAt: new Date(Date.now() + 600_000),
        priceCents: 4500,
        depositCents: 1000,
        manageTokenHash: `pay-hash-${seq}`,
      },
    });
    await prisma.payment.create({
      data: {
        appointmentId: appointment.id,
        amountCents: 1000,
        status: "PENDING",
        stripeCheckoutSessionId: `cs_test_${seq}`,
      },
    });
    return appointment;
  }

  it("turns a paid hold into a booking and clears the hold", async () => {
    const appointment = await hold({ start: "15:00", end: "16:00" });

    await expect(confirmPaidAppointment(appointment.id, "pi_test_1")).resolves.toBe(
      "confirmed",
    );

    const after = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointment.id },
      select: { status: true, holdExpiresAt: true },
    });
    expect(after.status).toBe("CONFIRMED");
    expect(after.holdExpiresAt).toBeNull();

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { appointmentId: appointment.id },
    });
    expect(payment.status).toBe("SUCCEEDED");
    expect(payment.stripePaymentIntentId).toBe("pi_test_1");
  });

  // Stripe retries a webhook until it gets a 2xx, so a second delivery of an
  // event already acted on has to be a no-op rather than a second booking.
  it("is safe to deliver twice", async () => {
    const appointment = await hold({ start: "15:00", end: "16:00" });

    await confirmPaidAppointment(appointment.id, "pi_test_2");
    await expect(confirmPaidAppointment(appointment.id, "pi_test_2")).resolves.toBe(
      "already",
    );
  });

  // The window is real: Stripe will not open a session expiring in under
  // half an hour, and a chair cannot be held that long.
  it("refunds rather than double-books when the slot went to someone else", async () => {
    const lapsed = await hold({ start: "15:00", end: "16:00", status: "CANCELLED" });
    await prisma.appointment.create({
      data: {
        barberId: eduardo,
        clientId,
        serviceId,
        contactName: "Got there first",
        contactEmail: "first@example.com",
        startsAt: new Date("2026-10-06T15:00:00Z"),
        endsAt: new Date("2026-10-06T16:00:00Z"),
        status: "CONFIRMED",
        priceCents: 4500,
        depositCents: 0,
        manageTokenHash: "pay-hash-winner",
      },
    });

    await expect(confirmPaidAppointment(lapsed.id, "pi_test_3")).resolves.toBe(
      "refunded",
    );

    const after = await prisma.appointment.findUniqueOrThrow({
      where: { id: lapsed.id },
      select: { status: true },
    });
    expect(after.status).toBe("CANCELLED");
    expect(refunds).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: "pi_test_3" }),
    );

    const payment = await prisma.payment.findUniqueOrThrow({
      where: { appointmentId: lapsed.id },
    });
    expect(payment.status).toBe("REFUNDED");
    expect(payment.refundedCents).toBe(1000);
  });

  it("honours a late payment when the slot is still free", async () => {
    const lapsed = await hold({ start: "17:00", end: "18:00", status: "CANCELLED" });

    await expect(confirmPaidAppointment(lapsed.id, "pi_test_4")).resolves.toBe(
      "confirmed",
    );
  });

  it("reports an unknown appointment rather than throwing", async () => {
    await expect(confirmPaidAppointment("does-not-exist", null)).resolves.toBe(
      "unknown",
    );
  });
});
