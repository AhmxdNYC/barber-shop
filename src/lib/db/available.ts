import "server-only";

/**
 * Whether a database is configured at all.
 *
 * The marketing side of the site — the menu, the hours, the roster — reads
 * from the database so the shop can change it without a deploy. That is
 * right, but it should not mean the whole site falls over when the database
 * is missing or unreachable. A barbershop's homepage returning a 500 because
 * Postgres is asleep is a worse failure than showing slightly stale prices.
 *
 * So public pages fall back to the seed content, which is the same data the
 * database was loaded from. Booking still needs a real connection, because
 * a booking nobody stored is worse than no booking at all.
 */
export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

/**
 * Runs a database read, falling back if it is unavailable.
 *
 * Deliberately catches rather than checking first: a configured database can
 * still be asleep, over its connection limit, or mid-failover, and the
 * homepage should survive all of those.
 */
export async function withFallback<T>(
  read: () => Promise<T>,
  fallback: T,
): Promise<T> {
  if (!hasDatabaseUrl) return fallback;
  try {
    return await read();
  } catch (error) {
    console.error("Database read failed; serving seed content.", error);
    return fallback;
  }
}
