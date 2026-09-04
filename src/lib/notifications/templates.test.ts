import { describe, expect, it } from "vitest";
import { bookingCancelled, bookingConfirmed, bookingReminder } from "./templates";

const details = {
  clientName: "Marcus",
  serviceName: "Adult Haircut",
  barberName: "Eduardo",
  startsAt: new Date("2026-09-15T18:30:00Z"), // 2:30pm New York
  priceCents: 4500,
  timeZone: "America/New_York",
  manageUrl: "https://eduardobarbershop.vercel.app/booking/tok123",
  cancellationWindowHours: 24,
};

describe("booking confirmation", () => {
  it("states the time in the shop's timezone, not UTC", () => {
    const { body } = bookingConfirmed(details);
    expect(body).toContain("2:30");
    expect(body).not.toContain("18:30");
  });

  it("carries the cancellation link, which is the only one a guest gets", () => {
    expect(bookingConfirmed(details).body).toContain(details.manageUrl);
  });

  it("names the service, barber and price", () => {
    const { body, subject } = bookingConfirmed(details);
    expect(subject).toContain("Adult Haircut");
    expect(body).toContain("Eduardo");
    expect(body).toContain("$45");
  });

  it("is plain text with no markup", () => {
    expect(bookingConfirmed(details).body).not.toMatch(/<[a-z]/i);
  });
});

describe("reminder", () => {
  it("leads with the time, since that is what the preview shows", () => {
    expect(bookingReminder(details).subject).toMatch(/^Tomorrow: /);
  });

  it("asks them to release the slot rather than just not turning up", () => {
    expect(bookingReminder(details).body.toLowerCase()).toContain("someone else");
  });
});

describe("cancellation", () => {
  it("says what was cancelled and invites them back", () => {
    const { subject, body } = bookingCancelled(details);
    expect(subject).toContain("Cancelled");
    expect(body).toContain("Adult Haircut");
    expect(body.toLowerCase()).toContain("book another time");
  });
});
