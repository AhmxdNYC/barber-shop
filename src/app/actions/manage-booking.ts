"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/client";
import {
  hashManageToken,
  looksLikeManageToken,
  manageTokenExpired,
} from "@/lib/booking/manage-token";
import { bookingDetailsFor } from "@/lib/notifications/booking-details";
import { sendBookingCancelled } from "@/lib/notifications/send";

/**
 * Guest booking management.
 *
 * The emailed link is the credential — there is no account. See
 * docs/GUEST-CANCELLATION.md for why the token is hashed, scoped and
 * expiring, and why cancelling is a POST rather than a link.
 */

export type ManagedBooking = {
  id: string;
  startsAt: Date;
  status: string;
  serviceName: string;
  barberName: string;
  contactName: string;
  priceCents: number;
  canCancel: boolean;
  cancellationWindowHours: number;
};

export async function findBookingByToken(
  token: string,
): Promise<ManagedBooking | null> {
  // Reject obvious junk before it reaches the database.
  if (!looksLikeManageToken(token)) return null;

  const appointment = await prisma.appointment.findUnique({
    where: { manageTokenHash: hashManageToken(token) },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      status: true,
      priceCents: true,
      contactName: true,
      service: { select: { name: true } },
      barber: { select: { name: true } },
    },
  });
  if (!appointment) return null;
  if (manageTokenExpired(appointment.endsAt)) return null;

  const settings = await prisma.shopSettings.findUnique({ where: { id: 1 } });
  const windowHours = settings?.cancellationWindowHours ?? 24;
  const hoursUntil =
    (appointment.startsAt.getTime() - Date.now()) / (60 * 60 * 1000);

  return {
    id: appointment.id,
    startsAt: appointment.startsAt,
    status: appointment.status,
    serviceName: appointment.service.name,
    barberName: appointment.barber.name,
    contactName: appointment.contactName,
    priceCents: appointment.priceCents,
    canCancel:
      (appointment.status === "CONFIRMED" ||
        appointment.status === "PENDING_PAYMENT") &&
      hoursUntil > 0,
    cancellationWindowHours: windowHours,
  };
}

export type CancelState = { error?: string; cancelled?: boolean };

/**
 * Cancels a booking from the guest link.
 *
 * Deliberately a POST behind a confirmation, never a GET. Mail scanners and
 * link-preview bots follow URLs in emails, so a one-click cancel link would
 * be triggered by a robot and the client would arrive to find their haircut
 * already gone.
 */
export async function cancelByTokenAction(
  _previous: CancelState,
  formData: FormData,
): Promise<CancelState> {
  const parsed = z
    .object({ token: z.string().min(10).max(80) })
    .safeParse({ token: formData.get("token") });

  if (!parsed.success) return { error: "That link is not valid." };

  const booking = await findBookingByToken(parsed.data.token);
  if (!booking) return { error: "That link has expired or is not valid." };
  if (!booking.canCancel) {
    return { error: "This booking can no longer be cancelled online. Please call the shop." };
  }

  const hoursUntil = (booking.startsAt.getTime() - Date.now()) / (60 * 60 * 1000);
  const insideWindow = hoursUntil < booking.cancellationWindowHours;

  await prisma.appointment.update({
    where: { id: booking.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: "guest_token",
      cancellationReason: insideWindow
        ? "Cancelled by client inside the notice window"
        : "Cancelled by client",
    },
  });

  const context = await bookingDetailsFor(booking.id);
  if (context) {
    await sendBookingCancelled(booking.id, context.recipient, context.details);
  }

  revalidatePath("/dashboard");
  return { cancelled: true };
}
