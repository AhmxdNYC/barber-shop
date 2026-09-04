import { afterAll, afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { hasDatabase } from "@/lib/db/test-helpers";
import {
  isLoginThrottled,
  purgeOldLoginAttempts,
  recordLoginAttempt,
  THROTTLE,
} from "./throttle";

/**
 * The control that actually protects a sign-in form.
 *
 * An identifier is not a secret — it is on business cards and in every email
 * the shop has sent. What protects the account is that an attacker gets a
 * handful of guesses rather than unlimited ones.
 */
const suite = hasDatabase ? describe : describe.skip;
const WHO = "throttle-test@booking-test.com";

suite("login throttling", () => {
  afterEach(async () => {
    await prisma.loginAttempt.deleteMany({ where: { identifier: WHO } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("allows a normal number of mistakes", async () => {
    await recordLoginAttempt(WHO, false);
    await recordLoginAttempt(WHO, false);
    expect(await isLoginThrottled(WHO)).toBe(false);
  });

  it("throttles once the limit is reached", async () => {
    for (let i = 0; i < THROTTLE.MAX_FAILURES; i++) {
      await recordLoginAttempt(WHO, false);
    }
    expect(await isLoginThrottled(WHO)).toBe(true);
  });

  it("throttles one identifier without affecting another", async () => {
    for (let i = 0; i < THROTTLE.MAX_FAILURES; i++) {
      await recordLoginAttempt(WHO, false);
    }
    expect(await isLoginThrottled("someone-else@booking-test.com")).toBe(false);
  });

  /** Mistyping three times then getting it right must not lock the shop out. */
  it("clears failures once a sign-in succeeds", async () => {
    for (let i = 0; i < THROTTLE.MAX_FAILURES; i++) {
      await recordLoginAttempt(WHO, false);
    }
    expect(await isLoginThrottled(WHO)).toBe(true);

    await recordLoginAttempt(WHO, true);
    expect(await isLoginThrottled(WHO)).toBe(false);
  });

  it("ignores failures older than the window", async () => {
    for (let i = 0; i < THROTTLE.MAX_FAILURES; i++) {
      await recordLoginAttempt(WHO, false);
    }
    await prisma.loginAttempt.updateMany({
      where: { identifier: WHO },
      data: {
        createdAt: new Date(Date.now() - (THROTTLE.WINDOW_MINUTES + 5) * 60_000),
      },
    });
    expect(await isLoginThrottled(WHO)).toBe(false);
  });

  it("purges attempts older than a day", async () => {
    await recordLoginAttempt(WHO, false);
    await prisma.loginAttempt.updateMany({
      where: { identifier: WHO },
      data: { createdAt: new Date(Date.now() - 26 * 60 * 60_000) },
    });
    expect(await purgeOldLoginAttempts()).toBeGreaterThan(0);
  });
});
