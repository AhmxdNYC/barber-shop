import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { hasDatabase } from "@/lib/db/test-helpers";
import { hashPassword } from "./password";
import { consumeMagicLink, issueDeviceLink, MAGIC_LINK_LIMITS } from "./magic-link";
import { SITE_URL } from "@/lib/qr";

const suite = hasDatabase ? describe : describe.skip;
const BARBER = "device-barber@booking-test.com";
const CLIENT = "device-client@booking-test.com";

suite("device sign-in codes", () => {
  beforeAll(async () => {
    await prisma.user.upsert({
      where: { email: BARBER },
      create: {
        email: BARBER,
        name: "Device Barber",
        role: "OWNER",
        passwordHash: await hashPassword("a-long-enough-password"),
      },
      update: { role: "OWNER" },
    });
    await prisma.user.upsert({
      where: { email: CLIENT },
      create: { email: CLIENT, name: "A Client", role: "CLIENT" },
      update: { role: "CLIENT" },
    });
  });

  beforeEach(async () => {
    await prisma.verificationToken.deleteMany({
      where: { identifier: { in: [BARBER, CLIENT] } },
    });
  });

  afterAll(async () => {
    await prisma.verificationToken.deleteMany({
      where: { identifier: { in: [BARBER, CLIENT] } },
    });
    await prisma.user.deleteMany({ where: { email: { in: [BARBER, CLIENT] } } });
    await prisma.$disconnect();
  });

  it("signs in the device that scans it", async () => {
    const issued = await issueDeviceLink(BARBER);
    expect(issued).not.toBeNull();
    const account = await consumeMagicLink(issued!.token);
    expect(account?.email).toBe(BARBER);
  });

  it("expires far sooner than an emailed link", async () => {
    const issued = await issueDeviceLink(BARBER);
    expect(issued!.expiresInSeconds).toBe(
      MAGIC_LINK_LIMITS.DEVICE_LINK_EXPIRY_MINUTES * 60,
    );
    expect(issued!.expiresInSeconds).toBeLessThan(
      MAGIC_LINK_LIMITS.EXPIRY_MINUTES * 60,
    );
  });

  it("works once, so a photographed code cannot be reused after it is used", async () => {
    const issued = await issueDeviceLink(BARBER);
    expect(await consumeMagicLink(issued!.token)).not.toBeNull();
    expect(await consumeMagicLink(issued!.token)).toBeNull();
  });

  it("will not issue one for a client account", async () => {
    expect(await issueDeviceLink(CLIENT)).toBeNull();
  });

  /**
   * The important one.
   *
   * The shop's QR code is printed on the window and scanned by every client
   * who walks past. It must lead to the booking page and nothing else — if
   * it could ever sign someone in, the entire street would be signed in as
   * the barber.
   */
  it("the shop's public booking QR cannot sign anyone in", async () => {
    expect(SITE_URL).not.toContain("token");
    expect(SITE_URL).not.toContain("/login");
    expect(SITE_URL).not.toContain("/dashboard");

    // Treating the public URL as a token must resolve to nothing.
    const asToken = SITE_URL.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 43);
    expect(await consumeMagicLink(asToken)).toBeNull();
  });
});
