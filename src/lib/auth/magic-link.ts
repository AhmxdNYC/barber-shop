import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/client";

/**
 * Sign-in links, so the barber never types a password.
 *
 * He enters his email once, taps the link in it, and is signed in for a
 * rolling month. A password he has to remember and type on a phone between
 * haircuts is friction that ends with the dashboard going unopened.
 *
 * The token is random, stored only as a hash, single-use and short-lived —
 * the same reasoning as the guest booking links. Reuses the VerificationToken
 * table, which already exists for exactly this shape of thing.
 */

const TOKEN_BYTES = 32;
const EXPIRY_MINUTES = 15;
const MAX_REQUESTS = 5;
const RATE_WINDOW_MINUTES = 15;

export const MAGIC_LINK_LIMITS = { EXPIRY_MINUTES, MAX_REQUESTS, RATE_WINDOW_MINUTES };

function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function isMagicLinkRateLimited(email: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000);
  const recent = await prisma.verificationToken.count({
    where: {
      identifier: email,
      // Tokens issued inside the window still have most of their life left.
      expires: { gt: since },
    },
  });
  return recent >= MAX_REQUESTS;
}

/**
 * Issues a link for a barber account.
 *
 * Returns null when the address is not a barber, and the caller must answer
 * identically either way so this cannot be used to discover staff addresses.
 */
export async function issueMagicLink(
  email: string,
): Promise<{ token: string; name: string } | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || (user.role !== "BARBER" && user.role !== "OWNER")) return null;

  const token = randomBytes(TOKEN_BYTES).toString("base64url");

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hash(token),
      expires: new Date(Date.now() + EXPIRY_MINUTES * 60_000),
    },
  });

  return { token, name: user.name ?? "Barber" };
}

/**
 * Consumes a link and returns the account it belongs to.
 *
 * The token is deleted on use, so a link forwarded, cached by a mail scanner
 * or left in browser history cannot sign anyone in a second time.
 */
export async function consumeMagicLink(token: string): Promise<{
  userId: string;
  email: string;
  name: string;
} | null> {
  if (!/^[A-Za-z0-9_-]{40,50}$/.test(token)) return null;

  const record = await prisma.verificationToken.findFirst({
    where: { token: hash(token) },
  });
  if (!record) return null;

  // Single use, whether or not it turns out to be valid.
  await prisma.verificationToken.deleteMany({ where: { token: hash(token) } });

  if (record.expires < new Date()) return null;

  const user = await prisma.user.findUnique({ where: { email: record.identifier } });
  if (!user || (user.role !== "BARBER" && user.role !== "OWNER")) return null;

  return { userId: user.id, email: user.email, name: user.name ?? "Barber" };
}

/** Clears expired tokens. Called by the daily job. */
export async function purgeExpiredMagicLinks(): Promise<number> {
  const { count } = await prisma.verificationToken.deleteMany({
    where: { expires: { lt: new Date() } },
  });
  return count;
}
