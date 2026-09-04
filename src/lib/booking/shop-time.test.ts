import { describe, expect, it } from "vitest";
import { fromZonedTime } from "date-fns-tz";

/**
 * The conversion used when the barber types a walk-in time.
 *
 * A datetime-local input has no timezone. Interpreting it in the server's
 * zone — UTC in production — would book every walk-in hours out, and the
 * error would be invisible in local development where the machine is
 * already on New York time.
 */
const TZ = "America/New_York";

describe("shop-local wall clock to UTC", () => {
  it("converts a summer time correctly (EDT, UTC-4)", () => {
    expect(fromZonedTime("2026-07-15T14:30:00", TZ).toISOString()).toBe(
      "2026-07-15T18:30:00.000Z",
    );
  });

  it("converts a winter time correctly (EST, UTC-5)", () => {
    expect(fromZonedTime("2026-01-15T14:30:00", TZ).toISOString()).toBe(
      "2026-01-15T19:30:00.000Z",
    );
  });

  it("uses the right offset on each side of the spring change", () => {
    const before = fromZonedTime("2026-03-07T14:00:00", TZ);
    const after = fromZonedTime("2026-03-09T14:00:00", TZ);
    // Same wall clock two days apart, but an hour less in real time.
    expect((after.getTime() - before.getTime()) / 60_000).toBe(2 * 24 * 60 - 60);
  });

  it("is not the naive interpretation", () => {
    const naive = new Date("2026-07-15T14:30:00Z");
    expect(fromZonedTime("2026-07-15T14:30:00", TZ).getTime()).not.toBe(
      naive.getTime(),
    );
  });
});
