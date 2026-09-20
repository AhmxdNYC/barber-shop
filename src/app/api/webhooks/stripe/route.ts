import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db/client";
import { confirmPaidAppointment } from "@/lib/payments/confirm";
import { stripe } from "@/lib/payments/stripe";

/**
 * Stripe's side of the conversation.
 *
 * The browser coming back to the success page is not proof of payment — it
 * is a URL anybody can type. This endpoint is, because the signature is
 * computed over the raw body with a secret only Stripe and this server hold.
 * So the booking is confirmed here and nowhere else.
 *
 * Signature verification needs the bytes exactly as sent, which is why the
 * body is read as text and never parsed before checking.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Unsigned" }, { status: 400 });
  }

  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    // Wrong secret, replayed body, or someone guessing. Same answer.
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const appointmentId = session.metadata?.appointmentId;
      if (!appointmentId) break;
      // Asynchronous methods complete later; only paid means paid.
      if (session.payment_status !== "paid") break;
      await confirmPaidAppointment(
        appointmentId,
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      );
      break;
    }

    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      const appointmentId = session.metadata?.appointmentId;
      if (!appointmentId) break;
      await confirmPaidAppointment(
        appointmentId,
        typeof session.payment_intent === "string" ? session.payment_intent : null,
      );
      break;
    }

    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object;
      const appointmentId = session.metadata?.appointmentId;
      if (!appointmentId) break;
      // Only ever releases a hold. A booking that reached CONFIRMED by some
      // other route is left alone.
      await prisma.appointment.updateMany({
        where: { id: appointmentId, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED", cancellationReason: "Deposit not paid" },
      });
      await prisma.payment.updateMany({
        where: { appointmentId, status: "PENDING" },
        data: { status: "FAILED" },
      });
      break;
    }

    case "charge.refunded": {
      // A refund issued from the Stripe dashboard rather than from here, so
      // the shop's own records agree with the money.
      const charge = event.data.object;
      const appointmentId = charge.metadata?.appointmentId;
      if (!appointmentId) break;
      await prisma.payment.updateMany({
        where: { appointmentId },
        data: {
          refundedCents: charge.amount_refunded,
          status:
            charge.amount_refunded >= charge.amount
              ? "REFUNDED"
              : "PARTIALLY_REFUNDED",
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
