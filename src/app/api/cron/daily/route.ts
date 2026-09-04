import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db/client";
import { bookingDetailsFor } from "@/lib/notifications/booking-details";
import { sendBookingReminder } from "@/lib/notifications/send";
import { purgeExpiredMagicLinks } from "@/lib/auth/magic-link";
import { purgeOldLoginAttempts } from "@/lib/auth/throttle";

/**
 * The one scheduled job.
 *
 * Deliberately small. Slot expiry is handled lazily on read, so nothing
 * time-sensitive depends on this running — a missed night costs reminders,
 * not correctness. That was a design constraint from the start, because free
 * hosting tiers commonly allow only one cron run per day.
 *
 * Protected by a shared secret rather than session auth, since the caller is
 * a scheduler and not a person.
 */
export const dynamic = "force-dynamic";

function authorised(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  // Without a configured secret the endpoint stays closed rather than open.
  if (!expected) return false;
  return request.headers.get("authorization") === `Bearer ${expected}`;
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const now = new Date();
  const from = new Date(now.getTime() + 24 * 60 * 60_000);
  const to = new Date(from.getTime() + 24 * 60 * 60_000);

  // Anything already reminded is skipped, so re-running the job is safe.
  const due = await prisma.appointment.findMany({
    where: {
      status: "CONFIRMED",
      startsAt: { gte: from, lt: to },
      notifications: { none: { type: "REMINDER_24H", status: "SENT" } },
    },
    select: { id: true },
  });

  let sent = 0;
  for (const appointment of due) {
    const context = await bookingDetailsFor(appointment.id);
    if (!context) continue;
    await sendBookingReminder(appointment.id, context.recipient, context.details);
    sent += 1;
  }

  // Tidy-up only. Availability already ignores expired holds on read.
  const expired = await prisma.appointment.updateMany({
    where: { status: "PENDING_PAYMENT", holdExpiresAt: { lt: now } },
    data: { status: "CANCELLED", cancellationReason: "Hold expired" },
  });

  const purgedLinks = await purgeExpiredMagicLinks();
  const purgedAttempts = await purgeOldLoginAttempts();

  return NextResponse.json({
    remindersSent: sent,
    holdsExpired: expired.count,
    expiredLinksPurged: purgedLinks,
    loginAttemptsPurged: purgedAttempts,
    ranAt: now.toISOString(),
  });
}
