import { describe, expect, it } from "vitest";
import { secondTicks } from "./chart-ticks";

describe("secondTicks", () => {
  it("spreads ticks evenly and closes on the last second", () => {
    expect(secondTicks(1, 14)).toEqual([1, 5, 9, 14]);
  });

  it("drops a regular tick that would crowd the final one", () => {
    // step 2 would give 1 3 5 7 8; 7 sits within half a step of 8.
    expect(secondTicks(1, 8)).toEqual([1, 3, 5, 8]);
    expect(secondTicks(1, 6)).toEqual([1, 3, 6]);
  });

  it("labels every second on very short runs", () => {
    expect(secondTicks(1, 2)).toEqual([1, 2]);
    expect(secondTicks(1, 4)).toEqual([1, 2, 3, 4]);
  });

  it("never yields more than intervals + 1 ticks", () => {
    for (let last = 2; last <= 200; last++) {
      const ticks = secondTicks(1, last);
      expect(ticks.length).toBeLessThanOrEqual(5);
      expect(ticks[0]).toBe(1);
      expect(ticks[ticks.length - 1]).toBe(last);
      // strictly increasing
      for (let i = 1; i < ticks.length; i++) {
        expect(ticks[i]!).toBeGreaterThan(ticks[i - 1]!);
      }
    }
  });

  it("handles a single-second or inverted range", () => {
    expect(secondTicks(3, 3)).toEqual([3]);
    expect(secondTicks(5, 2)).toEqual([5]);
  });

  it("returns nothing for non-finite input", () => {
    expect(secondTicks(Number.NaN, 4)).toEqual([]);
  });
});
