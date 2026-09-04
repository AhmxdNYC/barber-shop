import { describe, expect, it } from "vitest";
import { minutesToTimeInput, timeInputToMinutes } from "./time-input";

describe("time input conversion", () => {
  it("round-trips a normal opening time", () => {
    expect(minutesToTimeInput(630)).toBe("10:30");
    expect(timeInputToMinutes("10:30")).toBe(630);
  });

  it("handles midnight and the end of the day", () => {
    expect(minutesToTimeInput(0)).toBe("00:00");
    expect(timeInputToMinutes("00:00")).toBe(0);
    expect(minutesToTimeInput(1439)).toBe("23:59");
  });

  it("rejects nonsense rather than producing a wrong time", () => {
    for (const bad of ["", "25:00", "10:70", "abc", "10", "10:5"]) {
      expect(timeInputToMinutes(bad)).toBeNull();
    }
  });

  it("clamps out-of-range minutes instead of rendering junk", () => {
    expect(minutesToTimeInput(-30)).toBe("00:00");
    expect(minutesToTimeInput(5000)).toBe("23:59");
  });
});
