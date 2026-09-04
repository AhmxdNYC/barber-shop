import "server-only";
import { prisma } from "@/lib/db/client";
import { isRetryableTransactionError, isSlotTakenError } from "@/lib/db/errors";
import { withTransactionRetry } from "@/lib/db/transaction";
import { issueManageToken } from "./manage-token";
import { slotsForBarber } from "@/lib/availability/query";
import { bookingDetailsFor } from "@/lib/notifications/booking-details";
import { sendBookingConfirmation } from "@/lib/notifications/send";
import type { BookingResult } from "./types";

/**
 * Writes a booking.
 *
 * Three things have to be true at once and only the database can guarantee
 * the third:
 *
 *   1. the slot is one the engine actually offers  (checked here)
 *   2. the client exists as a row                  (upserted here)
 *   3. nobody else took the slot in the meantime   (exclusion constraint)
 *
 * The availability re-check is not redundant with the constraint. The
 * constraint stops overlapping appointments; it knows nothing about opening
 * hours, lead time or lunch breaks. Without the re-check a crafted request
 * could book 3am on a Monday when the shop is shut.
 */

export type CreateAppointmentInput = {
  barberSlug: string;
  serviceSlug: string;
  /** ISO instant of the slot start. */
  start: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  source?: "ONLINE" | "WALK_IN" | "PHONE";
  /** Barber-made bookings skip the lead-time rule. */
  skipLeadTime?: boolean;
};

export type CreateAppointmentSuccess = BookingResult & { ok: true };

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<BookingResult> {
  const start = new Date(input.start);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, reason: "invalid", message: "That time is not valid." };
  }

  const [barber, service, settings] = await Promise.all([
    prisma.barber.findUnique({ where: { slug: input.barberSlug } }),
    prisma.service.findUnique({ where: { slug: input.serviceSlug } }),
    prisma.shopSettings.findUnique({ where: { id: 1 } }),
  ]);

  if (!barber?.isActive || !service?.isActive || !settings) {
    return {
      ok: false,
      reason: "invalid",
      message: "That barber or service is not available.",
    };
  }

  // The chair is held for the cut plus its cleanup time.
  const end = new Date(
    start.getTime() +
      (service.durationMinutes + settings.bufferMinutes) * 60_000,
  );

  if (!input.skipLeadTime) {
    const date = formatShopDate(start, settings.timezone);
    const offered = await slotsForBarber(
      barber.slug,
      service.slug,
      date,
      new Date(),
    );
    const isOffered = offered.some((s) => s.start.getTime() === start.getTime());
    if (!isOffered) {
      return {
        ok: false,
        reason: "slot_taken",
        message: "That time is no longer available. Pick another.",
      };
    }
  }

  const email = input.email.trim().toLowerCase();
  const { token, hash } = issueManageToken();

  try {
    const appointment = await withTransactionRetry(() =>
      prisma.$transaction(async (tx) => {
      // Expired holds still satisfy the exclusion constraint, so they must
      // be cleared before inserting or an abandoned checkout would block
      // the slot until a scheduled job noticed.
      await tx.appointment.updateMany({
        where: {
          barberId: barber.id,
          status: "PENDING_PAYMENT",
          holdExpiresAt: { lt: new Date() },
        },
        data: { status: "CANCELLED", cancellationReason: "Hold expired" },
      });

      const client = await tx.client.upsert({
        where: { email },
        create: { email, name: input.name.trim(), phone: input.phone?.trim() || null },
        // Keep the latest contact details without wiping what we had.
        update: {
          name: input.name.trim() || undefined,
          phone: input.phone?.trim() || undefined,
        },
      });

      return tx.appointment.create({
        data: {
          barberId: barber.id,
          clientId: client.id,
          serviceId: service.id,
          startsAt: start,
          endsAt: end,
          // No deposit is taken yet, so a booking is confirmed outright.
          // When Stripe lands this becomes PENDING_PAYMENT with a hold.
          status: "CONFIRMED",
          source: input.source ?? "ONLINE",
          priceCents: service.priceCents,
          depositCents: service.depositCents,
          contactName: input.name.trim(),
          contactEmail: email,
          contactPhone: input.phone?.trim() || null,
          clientNotes: input.notes?.trim() || null,
          manageTokenHash: hash,
        },
        select: { id: true },
        });
      }),
    );

    // The plaintext token exists only here, so the confirmation has to be
    // sent now — it carries the only cancellation link the guest will get.
    // A failed send must not fail the booking, so this never throws.
    const context = await bookingDetailsFor(appointment.id, token);
    if (context) {
      await sendBookingConfirmation(
        appointment.id,
        context.recipient,
        context.details,
      );
    }

    return {
      ok: true,
      reference: appointment.id.slice(-6).toUpperCase(),
      message:
        "Check your email — we've sent your confirmation and a link to cancel if you need to.",
    };
  } catch (error) {
    // A retry that still conflicts means the slot genuinely went to someone
    // else — report it as taken rather than as a server error.
    if (isSlotTakenError(error) || isRetryableTransactionError(error)) {
      return {
        ok: false,
        reason: "slot_taken",
        message: "Someone just took that time. Pick another.",
      };
    }
    throw error;
  }
}

/** "YYYY-MM-DD" for an instant, in the shop's timezone. */
function formatShopDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}
