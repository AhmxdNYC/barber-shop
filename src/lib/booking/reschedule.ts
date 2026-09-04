import "server-only";
import { prisma } from "@/lib/db/client";
import { isRetryableTransactionError, isSlotTakenError } from "@/lib/db/errors";
import { withTransactionRetry } from "@/lib/db/transaction";
import { slotsForBarber } from "@/lib/availability/query";
import type { BookingResult } from "./types";

/**
 * Moves an existing appointment to a new time.
 *
 * Deliberately an update rather than cancel-and-rebook. Cancelling first
 * releases the old slot before the new one is secured, so a client trying to
 * move an appointment could end up with none at all if someone takes the new
 * time in between. Updating in place means the exclusion constraint either
 * accepts the move or rejects it, and the original booking survives a
 * rejection untouched.
 *
 * It also keeps the appointment's identity: the same row, the same manage
 * token, the same history on the client record.
 */
export async function rescheduleAppointment(
  appointmentId: string,
  newStart: Date,
): Promise<BookingResult> {
  const [appointment, settings] = await Promise.all([
    prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        status: true,
        startsAt: true,
        barber: { select: { slug: true } },
        service: { select: { slug: true, durationMinutes: true } },
      },
    }),
    prisma.shopSettings.findUnique({ where: { id: 1 } }),
  ]);

  if (!appointment || !settings) {
    return { ok: false, reason: "invalid", message: "That booking no longer exists." };
  }
  if (appointment.status !== "CONFIRMED" && appointment.status !== "PENDING_PAYMENT") {
    return {
      ok: false,
      reason: "invalid",
      message: "This booking can no longer be changed. Please call the shop.",
    };
  }
  if (appointment.startsAt.getTime() < Date.now()) {
    return { ok: false, reason: "invalid", message: "That appointment has already passed." };
  }

  // The new time has to be one the engine genuinely offers — the constraint
  // prevents overlaps but knows nothing about opening hours or lunch.
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: settings.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(newStart);

  const offered = await slotsForBarber(
    appointment.barber.slug,
    appointment.service.slug,
    date,
  );
  const target = offered.find((s) => s.start.getTime() === newStart.getTime());
  if (!target) {
    return {
      ok: false,
      reason: "slot_taken",
      message: "That time is not available. Pick another.",
    };
  }

  try {
    await withTransactionRetry(() =>
      prisma.appointment.update({
        where: { id: appointment.id },
        data: { startsAt: target.start, endsAt: target.end },
      }),
    );
  } catch (error) {
    if (isSlotTakenError(error) || isRetryableTransactionError(error)) {
      return {
        ok: false,
        reason: "slot_taken",
        message: "Someone just took that time. Pick another.",
      };
    }
    throw error;
  }

  return {
    ok: true,
    reference: appointment.id.slice(-6).toUpperCase(),
    message: "Your appointment has been moved.",
  };
}
