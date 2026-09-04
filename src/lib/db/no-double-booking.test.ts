import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./client";
import { isSlotTakenError } from "./errors";
import {
  barberIdBySlug,
  clearAppointments,
  ensureTestClient,
  hasDatabase,
  serviceIdBySlug,
} from "./test-helpers";

/**
 * The no-double-booking guarantee.
 *
 * This is the one rule the application cannot enforce correctly by itself: a
 * read-then-write availability check loses the race when two clients tap the
 * same slot at the same moment. It is enforced by a Postgres exclusion
 * constraint, so the test needs a real database.
 */
const suite = hasDatabase ? describe : describe.skip;

suite("no_overlapping_appointments", () => {
  let eduardo: string;
  let secondChair: string;
  let serviceId: string;
  let clientId: string;

  beforeAll(async () => {
    [eduardo, secondChair, serviceId, { id: clientId }] = await Promise.all([
      barberIdBySlug("eduardo"),
      barberIdBySlug("chair-2"),
      serviceIdBySlug("adult-haircut"),
      ensureTestClient(),
    ]);
  });

  beforeEach(async () => {
    await clearAppointments();
    await book({ barberId: eduardo, start: "15:00", end: "15:40" });
  });

  afterAll(async () => {
    await clearAppointments();
    await prisma.$disconnect();
  });

  let seq = 0;
  function book(opts: {
    barberId: string;
    start: string;
    end: string;
    status?: "CONFIRMED" | "CANCELLED" | "PENDING_PAYMENT";
  }) {
    seq += 1;
    return prisma.appointment.create({
      data: {
        barberId: opts.barberId,
        clientId,
        serviceId,
        contactName: "Test",
        contactEmail: "test@example.com",
        startsAt: new Date(`2026-09-15T${opts.start}:00Z`),
        endsAt: new Date(`2026-09-15T${opts.end}:00Z`),
        status: opts.status ?? "CONFIRMED",
        priceCents: 4000,
        depositCents: 1000,
        manageTokenHash: `test-hash-${seq}`,
      },
    });
  }

  it("rejects an overlapping booking for the same barber", async () => {
    // Asserted through the helper the booking code actually uses, so the
    // test breaks if that detection ever stops recognising the violation.
    await expect(
      book({ barberId: eduardo, start: "15:20", end: "16:00" }),
    ).rejects.toSatisfy(isSlotTakenError);
  });

  /** If this fails, the constraint is shop-wide and only one chair can work. */
  it("allows a different barber at the very same time", async () => {
    await expect(
      book({ barberId: secondChair, start: "15:00", end: "15:40" }),
    ).resolves.toBeDefined();
  });

  it("allows exactly back-to-back appointments", async () => {
    await expect(
      book({ barberId: eduardo, start: "15:40", end: "16:20" }),
    ).resolves.toBeDefined();
  });

  it("ignores cancelled appointments, so the slot frees up", async () => {
    await expect(
      book({ barberId: eduardo, start: "15:10", end: "15:30", status: "CANCELLED" }),
    ).resolves.toBeDefined();
  });

  it("counts an unpaid hold as occupying the slot", async () => {
    await clearAppointments();
    await book({ barberId: eduardo, start: "15:00", end: "15:40", status: "PENDING_PAYMENT" });
    await expect(
      book({ barberId: eduardo, start: "15:00", end: "15:40" }),
    ).rejects.toSatisfy(isSlotTakenError);
  });
});
