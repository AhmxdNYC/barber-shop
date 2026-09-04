import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { hasDatabase } from "@/lib/db/test-helpers";
import { hashPassword } from "./password";
import {
  MAGIC_LINK_LIMITS,
  consumeMagicLink,
  isMagicLinkRateLimited,
  issueMagicLink,
  purgeExpiredMagicLinks,
} from "./magic-link";

const suite = hasDatabase ? describe : describe.skip;

const BARBER = "magic-barber@booking-test.com";
const CLIENT = "magic-client@booking-test.com";

suite("barber sign-in links", () => {
  beforeAll(async () => {
    await prisma.user.upsert({
      where: { email: BARBER },
      create: {
        email: BARBER,
        name: "Magic Barber",
        role: "OWNER",
        passwordHash: await hashPassword("a-long-enough-password"),
      },
      update: { role: "OWNER" },
    });
    await prisma.user.upsert({
      where: { email: CLIENT },
      create: { email: CLIENT, name: "Not A Barber", role: "CLIENT" },
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

  it("issues a link that signs the barber in", async () => {
    const issued = await issueMagicLink(BARBER);
    expect(issued).not.toBeNull();

    const account = await consumeMagicLink(issued!.token);
    expect(account?.email).toBe(BARBER);
  });

  it("stores only the hash, never the token", async () => {
    const issued = await issueMagicLink(BARBER);
    const stored = await prisma.verificationToken.findFirst({
      where: { identifier: BARBER },
    });
    expect(stored?.token).not.toBe(issued!.token);
    expect(stored?.token).toMatch(/^[0-9a-f]{64}$/);
  });

  /** A link left in browser history or followed by a scanner must be dead. */
  it("works exactly once", async () => {
    const issued = await issueMagicLink(BARBER);
    expect(await consumeMagicLink(issued!.token)).not.toBeNull();
    expect(await consumeMagicLink(issued!.token)).toBeNull();
  });

  it("refuses an expired link", async () => {
    const issued = await issueMagicLink(BARBER);
    await prisma.verificationToken.updateMany({
      where: { identifier: BARBER },
      data: { expires: new Date(Date.now() - 1000) },
    });
    expect(await consumeMagicLink(issued!.token)).toBeNull();
  });

  it("will not issue a link for a client account", async () => {
    expect(await issueMagicLink(CLIENT)).toBeNull();
    expect(await issueMagicLink("nobody@booking-test.com")).toBeNull();
  });

  it("rejects junk without touching the database", async () => {
    for (const bad of ["", "short", "../../etc/passwd", "a".repeat(200)]) {
      expect(await consumeMagicLink(bad)).toBeNull();
    }
  });

  it("rate limits repeated requests", async () => {
    for (let i = 0; i < MAGIC_LINK_LIMITS.MAX_REQUESTS; i++) {
      await issueMagicLink(BARBER);
    }
    expect(await isMagicLinkRateLimited(BARBER)).toBe(true);
    expect(await isMagicLinkRateLimited(CLIENT)).toBe(false);
  });

  it("purges expired tokens", async () => {
    await issueMagicLink(BARBER);
    await prisma.verificationToken.updateMany({
      where: { identifier: BARBER },
      data: { expires: new Date(Date.now() - 1000) },
    });
    expect(await purgeExpiredMagicLinks()).toBeGreaterThan(0);
  });
});
