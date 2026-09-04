import "server-only";
import { prisma } from "@/lib/db/client";

/**
 * Slows down password guessing.
 *
 * This is the control that actually protects a sign-in form. An identifier —
 * whether a full address or a bare name — is not a secret: it appears on
 * business cards, in mailto links and in every email the shop has ever sent.
 * Treating it as one is security by obscurity, and it fails the moment
 * someone guesses that the barber called Eduardo uses "eduardo".
 *
 * What genuinely matters is how many guesses an attacker gets. Unlimited
 * attempts break any password; a handful per window break none.
 */

const MAX_FAILURES = 8;
const WINDOW_MINUTES = 15;

export const THROTTLE = { MAX_FAILURES, WINDOW_MINUTES };

function since(): Date {
  return new Date(Date.now() - WINDOW_MINUTES * 60_000);
}

export async function isLoginThrottled(identifier: string): Promise<boolean> {
  const failures = await prisma.loginAttempt.count({
    where: {
      identifier: identifier.trim().toLowerCase(),
      succeeded: false,
      createdAt: { gt: since() },
    },
  });
  return failures >= MAX_FAILURES;
}

export async function recordLoginAttempt(
  identifier: string,
  succeeded: boolean,
): Promise<void> {
  await prisma.loginAttempt.create({
    data: { identifier: identifier.trim().toLowerCase(), succeeded },
  });

  // A success clears the slate, so someone who mistypes a few times then
  // gets it right is not locked out of their own shop.
  if (succeeded) {
    await prisma.loginAttempt.deleteMany({
      where: { identifier: identifier.trim().toLowerCase(), succeeded: false },
    });
  }
}

/** Housekeeping for the daily job. */
export async function purgeOldLoginAttempts(): Promise<number> {
  const { count } = await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } },
  });
  return count;
}
