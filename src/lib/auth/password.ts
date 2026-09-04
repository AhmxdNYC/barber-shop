import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

/**
 * Password hashing with scrypt from the standard library.
 *
 * scrypt is deliberately memory-hard, which is what makes a stolen hash
 * expensive to attack. Using node:crypto avoids a native dependency that has
 * to compile on every machine and inside the deploy container — for a system
 * with a handful of accounts that simplicity is worth more than argon2's
 * marginal edge.
 *
 * Format: scrypt$<salt-hex>$<hash-hex>, so a future change of algorithm can
 * be detected from the stored value rather than guessed.
 *
 * Deliberately not marked `server-only`: the account-creation CLI shares it,
 * and it imports node:crypto, which cannot be bundled for the browser anyway.
 */
const KEY_LENGTH = 64;
const SALT_BYTES = 16;
const VERSION = "scrypt";

/**
 * Enforced in production only.
 *
 * A development database holds no real client data and gets a throwaway
 * password; requiring a strong one there buys nothing and makes the account
 * awkward to use. A deployed shop holds phone numbers and private notes.
 */
export const MIN_PASSWORD_LENGTH =
  process.env.NODE_ENV === "production" ? 12 : 6;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  }
  const salt = randomBytes(SALT_BYTES);
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `${VERSION}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string | null,
): Promise<boolean> {
  if (!stored) return false;

  const [version, saltHex, hashHex] = stored.split("$");
  if (version !== VERSION || !saltHex || !hashHex) return false;

  const expected = Buffer.from(hashHex, "hex");
  const derived = await scrypt(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length,
  );

  // Constant time, so a wrong password cannot be narrowed down by timing.
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
