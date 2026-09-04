import { describe, expect, it } from "vitest";
import {
  contactErrors,
  isPlausibleEmail,
  isPlausibleName,
  isPlausiblePhone,
  phoneDigits,
} from "./contact";

describe("phone", () => {
  it("accepts the ways people actually type a number", () => {
    for (const value of [
      "914-476-5347",
      "(914) 476-5347",
      "914 476 5347",
      "+1 914 476 5347",
      "9144765347",
    ]) {
      expect(isPlausiblePhone(value)).toBe(true);
    }
  });

  it("rejects things that cannot be rung", () => {
    for (const value of ["", "   ", "abc", "123", "1".repeat(20)]) {
      expect(isPlausiblePhone(value)).toBe(false);
    }
  });

  it("strips formatting down to digits", () => {
    expect(phoneDigits("(914) 476-5347")).toBe("9144765347");
  });
});

describe("email", () => {
  it("accepts ordinary addresses", () => {
    expect(isPlausibleEmail("someone@example.com")).toBe(true);
    expect(isPlausibleEmail("first.last+tag@sub.example.co.uk")).toBe(true);
  });

  it("rejects obvious rubbish", () => {
    for (const value of ["", "nope", "a@b", "a b@c.com"]) {
      expect(isPlausibleEmail(value)).toBe(false);
    }
  });
});

describe("name", () => {
  it("wants more than an initial", () => {
    expect(isPlausibleName("Al")).toBe(true);
    expect(isPlausibleName("A")).toBe(false);
    expect(isPlausibleName("  ")).toBe(false);
  });
});

describe("contactErrors", () => {
  it("passes a complete set of details", () => {
    expect(
      contactErrors({
        name: "Marcus Webb",
        email: "marcus@example.com",
        phone: "914-476-5347",
      }),
    ).toEqual({});
  });

  /** Phone is required now — this is the behaviour that changed. */
  it("requires a phone number", () => {
    const errors = contactErrors({
      name: "Marcus Webb",
      email: "marcus@example.com",
      phone: "",
    });
    expect(errors.phone).toBeTruthy();
  });

  it("names each bad field separately rather than failing as a whole", () => {
    const errors = contactErrors({ name: "M", email: "nope", phone: "123" });
    expect(errors.name).toBeTruthy();
    expect(errors.email).toBeTruthy();
    expect(errors.phone).toBeTruthy();
  });
});
