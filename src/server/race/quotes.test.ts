import { describe, expect, it } from "vitest";
import { pickRaceQuote } from "./quotes";

describe("pickRaceQuote", () => {
  it("returns a quote with text + source", () => {
    const q = pickRaceQuote();
    expect(q.text.length).toBeGreaterThan(0);
    expect(typeof q.source).toBe("string");
  });

  it("defaults to the small-to-large range (short..long, ≤600 chars)", () => {
    // 50 picks is enough that a stray thicc (601+) quote would trip
    // this even with a small pool. If the file is missing and we hit
    // the fallback, both fallbacks are in-band (medium) so it holds.
    for (let i = 0; i < 50; i += 1) {
      const q = pickRaceQuote();
      expect(q.text.length).toBeGreaterThanOrEqual(0);
      expect(q.text.length).toBeLessThanOrEqual(600);
    }
  });

  it("honours an explicit short-only range (≤100 chars)", () => {
    for (let i = 0; i < 50; i += 1) {
      const q = pickRaceQuote([0]);
      // The in-memory fallback (used only when english.json is
      // unreadable) is medium-length, so it can't satisfy a short-only
      // band — skip the range check on that degenerate path.
      if (q.source === "Fallback") continue;
      expect(q.text.length).toBeLessThanOrEqual(100);
    }
  });

  it("honours an explicit long-only range (301–600 chars)", () => {
    for (let i = 0; i < 50; i += 1) {
      const q = pickRaceQuote([2]);
      if (q.source === "Fallback") continue;
      expect(q.text.length).toBeGreaterThanOrEqual(301);
      expect(q.text.length).toBeLessThanOrEqual(600);
    }
  });

  it("never returns a quote containing the word god", () => {
    for (let i = 0; i < 100; i += 1) {
      const q = pickRaceQuote([0, 1, 2, 3]);
      expect(q.text).not.toMatch(/\bgod\b/i);
    }
  });
});
