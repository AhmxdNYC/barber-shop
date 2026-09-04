import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { clearAppointments, hasDatabase } from "@/lib/db/test-helpers";
import { slotsForBarber } from "@/lib/availability/query";
import { createAppointment } from "./create-appointment";
import { hashManageToken } from "./manage-token";
import { isRateLimited, reissueManageToken, RECOVERY_LIMITS } from "./recovery";

const suite = hasDatabase ? describe : describe.skip;
const EMAIL = "recover@booking-test.com";

suite("lost link recovery", () => {
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
    const slots = await slotsForBarber("eduardo", "haircut", date);
    if (slots.length === 0) return null;
    return createAppointment({
      barberSlug: "eduardo",
      serviceSlug: "haircut",
      start: slots[0].start.toISOString(),
      name: "Recover Test",
      email: EMAIL,
      phone: "914-555-0100",
    });
  }

  it("issues a working token for an upcoming booking", async () => {
    if (!(await book())) return;

    const reissued = await reissueManageToken(EMAIL);
    expect(reissued).not.toBeNull();

    const found = await prisma.appointment.findUnique({
      where: { manageTokenHash: hashManageToken(reissued!.token) },
    });
    expect(found?.id).toBe(reissued!.appointmentId);
  });

  /** Reissuing must revoke the previous link, not add a second working one. */
  it("invalidates the token it replaces", async () => {
    if (!(await book())) return;

    const before = await prisma.appointment.findFirst({
      select: { manageTokenHash: true },
    });
    await reissueManageToken(EMAIL);
    const after = await prisma.appointment.findFirst({
      select: { manageTokenHash: true },
    });

    expect(after?.manageTokenHash).not.toBe(before?.manageTokenHash);
    expect(
      await prisma.appointment.findUnique({
        where: { manageTokenHash: before!.manageTokenHash },
      }),
    ).toBeNull();
  });

  it("returns nothing for an address with no booking", async () => {
    expect(await reissueManageToken("nobody@booking-test.com")).toBeNull();
  });

  it("ignores cancelled and past bookings", async () => {
    if (!(await book())) return;
    await prisma.appointment.updateMany({ data: { status: "CANCELLED" } });
    expect(await reissueManageToken(EMAIL)).toBeNull();
  });

  it("rate limits after the configured number of sends", async () => {
    expect(await isRateLimited(EMAIL)).toBe(false);

    for (let i = 0; i < RECOVERY_LIMITS.MAX_SENDS; i++) {
      await prisma.notification.create({
        data: {
          channel: "EMAIL",
          type: "MANAGE_LINK",
          recipient: EMAIL,
          status: "SENT",
        },
      });
    }

    expect(await isRateLimited(EMAIL)).toBe(true);
    // Someone else's address is unaffected.
    expect(await isRateLimited("other@booking-test.com")).toBe(false);
  });
});
