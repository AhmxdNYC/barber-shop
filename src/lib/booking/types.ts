/**
 * The seam between the booking UI and whatever actually stores bookings.
 *
 * Today this resolves to the mock provider, so the flow is clickable but
 * nothing is persisted. Switching to a real system is a one-line change in
 * `index.ts` plus filling in that provider's adapter — the UI never changes.
 *
 * Two shapes of provider are supported:
 *
 *   "inline"   — we own the slots and the form. Our own API (see PLAN.md),
 *                or Square's Bookings API.
 *   "redirect" — a hosted booking page owned by someone else. We collect the
 *                barber and service, then hand off. Cheapest to run and by
 *                far the fastest to go live.
 */

export type TimeSlot = {
  /** ISO-8601 local start time, e.g. "2026-09-08T14:30". */
  start: string;
  /** Display label, e.g. "2:30pm". */
  label: string;
  available: boolean;
  /**
   * Who can take this time, when no barber was chosen.
   *
   * "First available" used to show bare times, so a client picked 2:30 with
   * no idea whose chair they were getting — and a barbershop is a place
   * people choose by person. Naming the barber turns the fallback option
   * into a real choice.
   */
  barbers?: { slug: string; name: string }[];
};

export type AvailabilityQuery = {
  /** "YYYY-MM-DD" */
  date: string;
  serviceSlug: string;
  /** null means "first available barber". */
  barberSlug: string | null;
};

export type BookingRequest = AvailabilityQuery & {
  start: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
};

export type BookingResult =
  | { ok: true; reference: string; message: string }
  | { ok: false; reason: "slot_taken" | "invalid" | "provider_error"; message: string };

export interface BookingProvider {
  readonly id: string;
  readonly label: string;
  readonly mode: "inline" | "redirect";

  /** Slots for one day. Redirect providers may return an empty list. */
  getAvailability(query: AvailabilityQuery): Promise<TimeSlot[]>;

  /** Only meaningful for inline providers. */
  createBooking(request: BookingRequest): Promise<BookingResult>;

  /** Only meaningful for redirect providers. */
  getRedirectUrl?(query: Partial<AvailabilityQuery>): string;
}
