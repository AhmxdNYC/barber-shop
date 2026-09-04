import type { BookingProvider } from "./types";
import { mockProvider } from "./providers/mock";
import { databaseProvider } from "./providers/database";
import { createHostedProvider } from "./providers/hosted";

export * from "./types";

/**
 * Which booking system is live.
 *
 *   mock     — clickable demo, nothing persisted
 *   database — our own schema and availability engine (default)
 *   hosted   — hand off to Square / Booksy / Fresha
 *
 * The UI never learns which of these it is talking to. Switching is an
 * environment variable, not a refactor.
 */
const PROVIDER_ID = process.env.NEXT_PUBLIC_BOOKING_PROVIDER ?? "database";

function resolve(): BookingProvider {
  switch (PROVIDER_ID) {
    case "mock":
      return mockProvider;
    case "hosted":
      return createHostedProvider({
        id: "hosted",
        label: process.env.NEXT_PUBLIC_BOOKING_LABEL ?? "our booking page",
        bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL ?? "",
      });
    case "database":
    default:
      return databaseProvider;
  }
}

export const bookingProvider: BookingProvider = resolve();

/** True while the flow is a demo, so the UI can say so honestly. */
export const IS_DEMO = bookingProvider.id === "mock";
