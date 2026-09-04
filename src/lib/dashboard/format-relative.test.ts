import { describe, expect, it } from "vitest";
import { agoInWords, cadenceInWords } from "./format-relative";

describe("agoInWords", () => {
  it("uses days for the first week", () => {
    expect(agoInWords(0)).toBe("today");
    expect(agoInWords(1)).toBe("yesterday");
    expect(agoInWords(4)).toBe("4 days ago");
  });

  /** Weeks are the unit haircuts actually happen on. */
  it("switches to weeks, which is how a barber thinks", () => {
    expect(agoInWords(7)).toBe("a week ago");
    expect(agoInWords(21)).toBe("3 weeks ago");
  });

  it("switches to months and years for long gaps", () => {
    expect(agoInWords(90)).toBe("3 months ago");
    expect(agoInWords(400)).toBe("over a year ago");
    expect(agoInWords(800)).toBe("2 years ago");
  });

  it("says never rather than showing a blank", () => {
    expect(agoInWords(null)).toBe("never");
  });
});

describe("cadenceInWords", () => {
  it("describes a rhythm in weeks", () => {
    expect(cadenceInWords(7)).toBe("weekly");
    expect(cadenceInWords(28)).toBe("every 4 weeks");
    // Nobody books to the day, so a day either side is still weekly.
    expect(cadenceInWords(8)).toBe("weekly");
  });

  it("falls back to days for very frequent visits", () => {
    expect(cadenceInWords(5)).toBe("every 5 days");
  });

  it("uses months for infrequent ones", () => {
    // A month reads better as four weeks at this scale.
    expect(cadenceInWords(30)).toBe("every 4 weeks");
    expect(cadenceInWords(90)).toBe("every 3 months");
  });

  /** One visit is not a rhythm, and guessing one would be misleading. */
  it("returns nothing when there is not enough history", () => {
    expect(cadenceInWords(null)).toBeNull();
  });
});
