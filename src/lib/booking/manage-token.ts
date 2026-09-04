import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Capability tokens for the guest "manage my booking" link.
 *
 * A guest never creates an account, so the emailed link *is* the
 * credential. Two decisions follow from that:
 *
 * 1. The token is 256 bits of `randomBytes`, not a cuid. Prisma's
 *    `@default(cuid())` is collision-resistant but embeds a timestamp and
 *    an in-process counter, so tokens issued near each other are related.
 *    Fine for a primary key, wrong for anything a stranger must not guess.
 *
 * 2. Only the SHA-256 *hash* is stored. The plaintext exists once, in the
 *    email. A database leak therefore yields no usable cancellation links,
 *    the same reason password hashes exist. The cost is that a link can
 *    never be re-sent — recovery issues a fresh token instead, which is
 *    the behaviour you want anyway.
 */

const TOKEN_BYTES = 32;

export type IssuedToken = {
  /** Goes in the email link. Never persisted. */
  token: string;
  /** Persisted on the appointment. */
  hash: string;
};

export function issueManageToken(): IssuedToken {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  return { token, hash: hashManageToken(token) };
}

export function hashManageToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Constant-time comparison of two hashes.
 *
 * Lookups go through the indexed hash column, so this is belt-and-braces
 * for anywhere a hash is compared in application code instead.
 */
export function manageTokenMatches(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Rejects anything that could not be one of our tokens before hitting the database. */
export function looksLikeManageToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{40,50}$/.test(value);
}

/**
 * How long a link stays usable.
 *
 * Kept alive past the appointment so someone can still open the confirmation
 * they were sent, but not indefinitely — an email inbox is a long-lived,
 * frequently-breached place for a working credential to sit.
 */
export const MANAGE_TOKEN_GRACE_DAYS = 7;

export function manageTokenExpired(
  appointmentEndsAt: Date,
  now: Date = new Date(),
): boolean {
  const expiry =
    appointmentEndsAt.getTime() + MANAGE_TOKEN_GRACE_DAYS * 24 * 60 * 60_000;
  return now.getTime() > expiry;
}
