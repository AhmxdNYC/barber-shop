import "server-only";
import { prisma } from "@/lib/db/client";
import { isSlotTakenError } from "@/lib/db/errors";
import { issueManageToken } from "@/lib/booking/manage-token";
import { bookingDetailsFor } from "@/lib/notifications/booking-details";
import { sendBookingConfirmation } from "@/lib/notifications/send";
import { stripe } from "./stripe";

export type ConfirmOutcome = "confirmed" | "already" | "refunded" | "unknown";

/**
 * Turns a paid hold into a booking.
 *
 * Called from the webhook, which Stripe will happily deliver more than once
 * and out of order, so everything here is safe to repeat: a second delivery
 * finds the appointment already CONFIRMED and stops.
 *
 * The hard case is a payment that lands after the hold expired. Stripe will
 * not open a Checkout session that expires in under half an hour, and a
 * barbershop cannot hold a chair that long, so the window genuinely exists.
 * If the slot is still free the booking is honoured — the client paid and
 * nobody lost anything. If somebody else took it, the money goes straight
 * back, because the alternative is two people in one chair.
 *
 * Whether the slot is free is not asked, it is attempted: the exclusion
 * constraint is the only thing that knows, and asking first would leave a
 * gap between the answer and the write.
 */
export async function confirmPaidAppointment(
  appointmentId: string,
  paymentIntentId: string | null,
): Promise<ConfirmOutcome> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true, status: true },
  });
  if (!appointment) return "unknown";

  await prisma.payment.updateMany({
    where: { appointmentId },
    data: {
      status: "SUCCEEDED",
      ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
    },
  });

  if (appointment.status === "CONFIRMED" || appointment.status === "COMPLETED") {
    return "already";
  }

  const { token, hash } = issueManageToken();

  try {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CONFIRMED",
        holdExpiresAt: null,
        manageTokenHash: hash,
        cancellationReason: null,
      },
    });
  } catch (error) {
    if (!isSlotTakenError(error)) throw error;
    await refundDeposit(appointmentId, "Slot was taken before payment landed");
    return "refunded";
  }

  // The plaintext token exists only in this scope, and the confirmation
  // carries the only cancellation link the guest will ever get.
  const context = await bookingDetailsFor(appointmentId, token);
  if (context) {
    await sendBookingConfirmation(appointmentId, context.recipient, context.details);
  }

  return "confirmed";
}

/** Sends a deposit back and records it against the appointment. */
export async function refundDeposit(
  appointmentId: string,
  reason: string,
): Promise<boolean> {
  const payment = await prisma.payment.findUnique({
    where: { appointmentId },
    select: {
      id: true,
      stripePaymentIntentId: true,
      amountCents: true,
      refundedCents: true,
      status: true,
    },
  });
  if (!payment?.stripePaymentIntentId) return false;
  if (payment.status === "REFUNDED") return true;

  const refund = await stripe().refunds.create({
    payment_intent: payment.stripePaymentIntentId,
    metadata: { appointmentId, reason },
  });

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "REFUNDED",
        refundedCents: payment.amountCents,
        stripeRefundId: refund.id,
      },
    }),
    prisma.appointment.updateMany({
      where: { id: appointmentId, status: { not: "CANCELLED" } },
      data: { status: "CANCELLED", cancellationReason: reason },
    }),
  ]);

  return true;
}
