import { describe, expect, it } from "vitest";
import { pickRaceQuote } from "./quotes";

describe("pickRaceQuote", () => {
  it("returns a quote with text + source", () => {
    const q = pickRaceQuote();
    expect(q.text.length).toBeGreaterThan(0);
    expect(typeof q.source).toBe("string");
  });

  it("returns medium-length quotes (101–300 chars) on the happy path", () => {
    // 50 picks is enough that a stray "short" quote would trip this
    // even with a small pool. If the file is missing and we hit the
    // fallback, both fallbacks are also in-band so the assertion
    // still holds.
    for (let i = 0; i < 50; i += 1) {
      const q = pickRaceQuote();
      expect(q.text.length).toBeGreaterThanOrEqual(101);
      expect(q.text.length).toBeLessThanOrEqual(300);
    }
  });

  it("never returns a quote containing the word god", () => {
    for (let i = 0; i < 100; i += 1) {
      const q = pickRaceQuote();
      expect(q.text).not.toMatch(/\bgod\b/i);
    }
  });
});
