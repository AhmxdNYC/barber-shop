import "server-only";
import Stripe from "stripe";

/**
 * The Stripe client.
 *
 * Built on first use rather than at import, for the same reason the Prisma
 * client is: importing a module must not require credentials. Pages that
 * never take a payment are built and rendered on machines that have no
 * Stripe keys, and a constructor at module scope would break all of them.
 *
 * No apiVersion is pinned. The SDK ships with the version it was written
 * against, and pinning a different one here is how you get type-correct code
 * that fails at runtime.
 */
let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  client ??= new Stripe(key);
  return client;
}

/** Whether the keys needed to take a payment are present. */
export const stripeConfigured = Boolean(
  process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET,
);

/**
 * Test keys and live keys are distinguishable by prefix, which is worth
 * surfacing: a shop taking real money on test keys takes nothing at all,
 * and it looks identical from the outside until the payout never arrives.
 */
export const stripeIsTestMode =
  process.env.STRIPE_SECRET_KEY?.startsWith("sk_test") ?? true;

/**
 * Stripe refuses a Checkout session expiring sooner than this, so a shop
 * hold shorter than half an hour cannot be mirrored onto the session. The
 * gap is handled at the other end — see confirmPaidAppointment.
 */
export const MIN_SESSION_MINUTES = 30;
