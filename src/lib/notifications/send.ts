import "server-only";
import { prisma } from "@/lib/db/client";
import { resolveTransport } from "./transports";
import {
  barberSignInLink,
  bookingCancelled,
  bookingConfirmed,
  bookingReminder,
  manageLinkResent,
  type BookingDetails,
} from "./templates";
import type { OutboundMessage } from "./types";

/**
 * Sends a message and records the attempt.
 *
 * Every send writes a Notification row, successful or not. A failed email
 * that only appears in a log is a message nobody knows was lost; as a row it
 * is visible and can be retried. That matters most for the confirmation,
 * which carries the only link a guest has for cancelling.
 *
 * Sending never throws into the caller. A booking that succeeded must not be
 * reported as failed because an email provider had a bad minute — the
 * appointment is the thing that matters, the email is a courtesy.
 */

type NotificationType =
  | "BOOKING_CONFIRMED"
  | "REMINDER_24H"
  | "CANCELLED"
  | "RESCHEDULED"
  | "WAITLIST_OPENING"
  | "MANAGE_LINK"
  | "SIGN_IN";

async function deliver(
  appointmentId: string | null,
  type: NotificationType,
  recipient: string,
  message: OutboundMessage,
): Promise<void> {
  const transport = resolveTransport();

  const row = await prisma.notification.create({
    data: {
      appointmentId,
      channel: transport.channel,
      type,
      recipient,
      status: "QUEUED",
    },
    select: { id: true },
  });

  try {
    const result = await transport.send({ ...message, to: recipient });
    await prisma.notification.update({
      where: { id: row.id },
      data: result.ok
        ? {
            status: "SENT",
            sentAt: new Date(),
            providerMessageId: result.providerMessageId ?? null,
          }
        : { status: "FAILED", error: result.error.slice(0, 500) },
    });
  } catch (error) {
    await prisma.notification.update({
      where: { id: row.id },
      data: {
        status: "FAILED",
        error: (error instanceof Error ? error.message : String(error)).slice(0, 500),
      },
    });
  }
}

export async function sendBookingConfirmation(
  appointmentId: string,
  recipient: string,
  details: BookingDetails,
) {
  await deliver(appointmentId, "BOOKING_CONFIRMED", recipient, bookingConfirmed(details));
}

export async function sendBookingReminder(
  appointmentId: string,
  recipient: string,
  details: BookingDetails,
) {
  await deliver(appointmentId, "REMINDER_24H", recipient, bookingReminder(details));
}

export async function sendBookingCancelled(
  appointmentId: string,
  recipient: string,
  details: BookingDetails,
) {
  await deliver(appointmentId, "CANCELLED", recipient, bookingCancelled(details));
}


export async function sendManageLink(
  appointmentId: string,
  recipient: string,
  details: BookingDetails,
) {
  await deliver(appointmentId, "MANAGE_LINK", recipient, manageLinkResent(details));
}


/**
 * Sends a barber sign-in link.
 *
 * Recorded with a null appointment id — it is not about a booking, but it
 * still belongs in the outbox so a link that failed to send is visible
 * rather than a mystery about why someone cannot get in.
 */
export async function sendBarberSignInLink(
  recipient: string,
  options: { name: string; url: string; expiryMinutes: number },
) {
  await deliver(null, "SIGN_IN", recipient, barberSignInLink(options));
}
