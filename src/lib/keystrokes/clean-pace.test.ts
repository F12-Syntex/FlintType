import { describe, expect, it } from "vitest";
import type { KeystrokeTiming } from "@/types/adapt";
import { MIN_PACE_INTERVALS, cleanPaceMs } from "./clean-pace";
import { MIN_INTERVAL_MS } from "./taint";

function k(
  t: number,
  expected: string,
  correct = true,
  wordIndex = 0,
): KeystrokeTiming {
  return { t, expected, typed: correct ? expected : "#", correct, wordIndex };
}

/** One clean word whose in-word intervals are `gaps`. */
function word(gaps: number[], wordIndex = 0, start = 0): KeystrokeTiming[] {
  const out = [k(start, "a", true, wordIndex)];
  let t = start;
  for (const g of gaps) {
    t += g;
    out.push(k(t, "a", true, wordIndex));
  }
  return out;
}

const pace = (timings: KeystrokeTiming[], overall: number, tainted?: boolean[]) =>
  cleanPaceMs(timings, tainted ?? timings.map(() => false), overall, MIN_INTERVAL_MS);

describe("cleanPaceMs", () => {
  it("is 0 before the user has a baseline", () => {
    expect(pace(word([100, 100, 100, 100, 100, 100]), 0)).toBe(0);
  });

  it("is the median clean interval, capped at the baseline", () => {
    const timings = word([100, 120, 140, 160, 2_000]);
    expect(pace(timings, 500)).toBe(140); // the 2s hesitation doesn't move it
    expect(pace(timings, 130)).toBe(130);
  });

  it("falls back to the baseline when the test has too few clean intervals", () => {
    const gaps = Array.from({ length: MIN_PACE_INTERVALS - 1 }, () => 100);
    expect(pace(word(gaps), 300)).toBe(300);
  });

  it("only counts clean in-word intervals", () => {
    // Clean: 100, 110, 120 | 130, 140 → median 120. Any one excluded
    // interval leaking in would move the median off 120.
    const timings = [
      ...word([100, 110, 120], 0, 0),
      ...word([130, 140], 1, 1_000), // 670ms across the word boundary
      k(1_300, "b", false, 1), // wrong key
      k(1_500, "c", true, 1), // its recovery key (tainted)
      k(1_700, "d", true, 1), // 200ms after a tainted key
      k(1_710, "e", true, 1), // below MIN_INTERVAL_MS
    ];
    const tainted = timings.map((_, i) => i === 7 || i === 8);
    expect(pace(timings, 1_000, tainted)).toBe(120);
  });
});
