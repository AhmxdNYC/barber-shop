import type {
  AvailabilityQuery,
  BookingProvider,

  BookingResult,
  TimeSlot,
} from "../types";
import { getAvailabilityAction } from "@/app/actions/booking";

/**
 * The real provider: our own database and availability engine.
 *
 * Slots come from a server action rather than being computed in the browser,
 * because the engine needs the shop's working hours, every barber's booked
 * appointments and the shop settings — none of which belong on the client.
 */
export const databaseProvider: BookingProvider = {
  id: "database",
  label: "Eduardo Barbershop",
  mode: "inline",

  async getAvailability(query: AvailabilityQuery): Promise<TimeSlot[]> {
    return getAvailabilityAction(query);
  },

  async createBooking(): Promise<BookingResult> {
    // Booking writes land in the next phase, together with the deposit flow.
    return {
      ok: false,
      reason: "provider_error",
      message: "Booking is not switched on yet — availability only.",
    };
  },
};
