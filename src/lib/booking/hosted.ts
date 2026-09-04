import type { AvailabilityQuery, BookingProvider, BookingResult } from "./types";

/**
 * Adapter for any hosted booking page (Square, Booksy, Fresha, Setmore).
 *
 * These systems own the calendar, the reminders and the payments, so all we
 * do is collect the barber and service, then hand the client off with those
 * pre-selected. This is the cheapest possible route to a working booking
 * system — see docs/BOOKING-PROVIDERS.md for the cost comparison.
 *
 * To switch on: set NEXT_PUBLIC_BOOKING_PROVIDER=hosted and the two URLs.
 */
function buildUrl(base: string, query: Partial<AvailabilityQuery>): string {
  if (!base) return "#";
  try {
    const url = new URL(base);
    // Most hosted systems accept staff/service hints as query params. The
    // exact param names differ per vendor — set them here once you have the
    // real booking URL in hand.
    if (query.barberSlug) url.searchParams.set("staff", query.barberSlug);
    if (query.serviceSlug) url.searchParams.set("service", query.serviceSlug);
    return url.toString();
  } catch {
    return base;
  }
}

export function createHostedProvider(config: {
  id: string;
  label: string;
  bookingUrl: string;
}): BookingProvider {
  return {
    id: config.id,
    label: config.label,
    mode: "redirect",

    async getAvailability(): Promise<[]> {
      // The hosted page owns availability; we never render slots.
      return [];
    },

    async createBooking(): Promise<BookingResult> {
      return {
        ok: false,
        reason: "provider_error",
        message: "This provider completes booking on its own hosted page.",
      };
    },

    getRedirectUrl(query) {
      return buildUrl(config.bookingUrl, query);
    },
  };
}
