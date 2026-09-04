import type {
  AvailabilityQuery,
  BookingProvider,
  BookingRequest,
  BookingResult,
  TimeSlot,
} from "../types";
import { HOURS, getService, formatMinutes } from "@/lib/shop";

/** Stable hash so the same day always shows the same slots. */
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Generates plausible-looking availability with no backend.
 * Replaced wholesale by a real provider — nothing else imports this.
 */
export const mockProvider: BookingProvider = {
  id: "mock",
  label: "Demo mode",
  mode: "inline",

  async getAvailability({ date, serviceSlug, barberSlug }: AvailabilityQuery) {
    const service = getService(serviceSlug);
    if (!service) return [];

    // Parse as local date parts to avoid UTC drift on "YYYY-MM-DD".
    const [y, m, d] = date.split("-").map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const hours = HOURS[dayOfWeek];
    if (hours.opens === null || hours.closes === null) return [];

    const step = 30;
    const slots: TimeSlot[] = [];
    const seed = `${date}|${barberSlug ?? "any"}`;

    for (
      let minute = hours.opens;
      minute + service.durationMinutes <= hours.closes;
      minute += step
    ) {
      const hh = String(Math.floor(minute / 60)).padStart(2, "0");
      const mm = String(minute % 60).padStart(2, "0");
      // Roughly two thirds open, deterministic per slot.
      const available = hash(`${seed}|${minute}`) % 3 !== 0;
      slots.push({
        start: `${date}T${hh}:${mm}`,
        label: formatMinutes(minute),
        available,
      });
    }
    return slots;
  },

  async createBooking(request: BookingRequest): Promise<BookingResult> {
    if (!request.name.trim() || !request.email.includes("@")) {
      return { ok: false, reason: "invalid", message: "Check your name and email." };
    }
    return {
      ok: true,
      reference: `DEMO-${hash(request.start + request.email) % 100000}`,
      message: "This is a demo booking — nothing was saved and no card was charged.",
    };
  },
};
