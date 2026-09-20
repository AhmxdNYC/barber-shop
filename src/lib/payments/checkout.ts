import "server-only";
import { prisma } from "@/lib/db/client";
import { SITE_URL } from "@/lib/qr";
import { MIN_SESSION_MINUTES, stripe } from "./stripe";

/**
 * Opens a Stripe Checkout session for an appointment's deposit.
 *
 * The deposit is part of the price, not a bond: the client pays it now and
 * the rest in the chair. That matters to the fee arithmetic — Stripe keeps
 * the thirty-cent fixed fee when a payment is refunded, so a deposit that
 * comes back on every kept appointment costs the shop money on every kept
 * appointment. One that counts toward the cut is only ever refunded when
 * something has actually gone wrong.
 *
 * Returns the URL to send the client to, or null if Stripe declined to open
 * one — in which case the caller must not leave the booking pending.
 */
export async function createDepositCheckout(input: {
  appointmentId: string;
  amountCents: number;
  priceCents: number;
  email: string;
  serviceName: string;
  barberName: string;
  when: string;
}): Promise<string | null> {
  const balanceCents = Math.max(input.priceCents - input.amountCents, 0);

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    customer_email: input.email,
    // Both places, deliberately. The session carries it for
    // checkout.session.*, the intent for charge.refunded — which arrives
    // with no session attached.
    metadata: { appointmentId: input.appointmentId },
    payment_intent_data: {
      metadata: { appointmentId: input.appointmentId },
      description: `Deposit — ${input.serviceName} with ${input.barberName}`,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: input.amountCents,
          product_data: {
            name: `Deposit — ${input.serviceName}`,
            description:
              balanceCents > 0
                ? `${input.barberName}, ${input.when}. $${(balanceCents / 100).toFixed(2)} to pay in the shop.`
                : `${input.barberName}, ${input.when}.`,
          },
        },
      },
    ],
    expires_at: Math.floor(Date.now() / 1000) + MIN_SESSION_MINUTES * 60,
    success_url: `${SITE_URL}/book/paid?appointment=${input.appointmentId}`,
    cancel_url: `${SITE_URL}/book?abandoned=${input.appointmentId}`,
  });

  if (!session.url) return null;

  await prisma.payment.upsert({
    where: { appointmentId: input.appointmentId },
    create: {
      appointmentId: input.appointmentId,
      stripeCheckoutSessionId: session.id,
      amountCents: input.amountCents,
      status: "PENDING",
    },
    update: {
      stripeCheckoutSessionId: session.id,
      amountCents: input.amountCents,
      status: "PENDING",
    },
  });

  return session.url;
}
