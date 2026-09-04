import "server-only";
import { prisma } from "@/lib/db/client";
import type { BookingDetails } from "./templates";

/**
 * Assembles what every template needs from an appointment id.
 *
 * The manage token cannot be read back — only its hash is stored — so a
 * caller that has just issued one passes it in. Anything sent later, such as
 * a reminder, links to the booking page without a token and asks the client
 * to use their original email or call.
 */
export async function bookingDetailsFor(
  appointmentId: string,
  manageToken?: string,
): Promise<{ details: BookingDetails; recipient: string } | null> {
  const [appointment, settings] = await Promise.all([
    prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        startsAt: true,
        priceCents: true,
        contactName: true,
        contactEmail: true,
        service: { select: { name: true } },
        barber: { select: { name: true } },
      },
    }),
    prisma.shopSettings.findUnique({ where: { id: 1 } }),
  ]);

  if (!appointment) return null;

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return {
    recipient: appointment.contactEmail,
    details: {
      clientName: appointment.contactName,
      serviceName: appointment.service.name,
      barberName: appointment.barber.name,
      startsAt: appointment.startsAt,
      priceCents: appointment.priceCents,
      timeZone: settings?.timezone ?? "America/New_York",
      manageUrl: manageToken ? `${base}/booking/${manageToken}` : `${base}/book`,
      cancellationWindowHours: settings?.cancellationWindowHours ?? 24,
    },
  };
}
