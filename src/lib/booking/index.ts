import type { BookingProvider } from "./types";
import { mockProvider } from "./mock";
import { createHostedProvider } from "./hosted";

export * from "./types";

/**
 * Which booking system is live.
 *
 *   mock   — clickable demo, nothing persisted (default)
 *   hosted — hand off to Square / Booksy / Fresha / Setmore
 *   self   — our own API and database, per PLAN.md (not built yet)
 */
const PROVIDER_ID = process.env.NEXT_PUBLIC_BOOKING_PROVIDER ?? "mock";
const HOSTED_URL = process.env.NEXT_PUBLIC_BOOKING_URL ?? "";
const HOSTED_LABEL = process.env.NEXT_PUBLIC_BOOKING_LABEL ?? "our booking page";

function resolve(): BookingProvider {
  switch (PROVIDER_ID) {
    case "hosted":
      return createHostedProvider({
        id: "hosted",
        label: HOSTED_LABEL,
        bookingUrl: HOSTED_URL,
      });
    case "mock":
    default:
      return mockProvider;
  }
}

export const bookingProvider: BookingProvider = resolve();

/** True while the flow is a demo, so the UI can say so honestly. */
export const IS_DEMO = bookingProvider.id === "mock";
