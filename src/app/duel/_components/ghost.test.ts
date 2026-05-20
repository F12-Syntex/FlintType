import { describe, expect, it } from "vitest";
import { ghostCumulativeChars } from "./ghost";

describe("ghostCumulativeChars", () => {
  it("maps a steady cumulative-average trace to linear char growth", () => {
    // 60 wpm sustained → 5 chars/sec.
    const cum = ghostCumulativeChars([60, 60, 60]);
    expect(cum[0]).toBeCloseTo(5, 5); // after 1s
    expect(cum[1]).toBeCloseTo(10, 5); // after 2s
    expect(cum[2]).toBeCloseTo(15, 5); // after 3s
  });

  it("recovers the true final position on an accelerating run", () => {
    // Idle 5s, then 50 chars typed by second 10. The cumulative-average
    // WPM at second 10 is (50/5) / (10/60) = 60. The final cumulative
    // char count must be the real 50 — NOT the ~17.7 the old
    // re-integration produced.
    const samples = [0, 0, 0, 0, 0, 12, 24, 36, 48, 60];
    const cum = ghostCumulativeChars(samples);
    expect(cum[9]).toBeCloseTo(50, 5); // 60 * 5 * 10 / 60
  });

  it("clamps negative samples to zero", () => {
    expect(ghostCumulativeChars([-10])[0]).toBe(0);
  });
});
