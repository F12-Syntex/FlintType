import type { KeystrokeTiming } from "@/types/adapt";

/** Fewest clean intervals a test needs before its median counts as
 *  the user's pace. Below this the median is noise, and the stored
 *  overall baseline stands in. */
export const MIN_PACE_INTERVALS = 5;

/** The user's clean pace (ms per keystroke interval) for one test: the
 *  median of the test's clean in-word intervals, capped at the stored
 *  overall bigram baseline.
 *
 *  Slip costs (`slips.ts`) and the pause gate (`measure.ts`) are scaled
 *  by this. The stored means are effective times that already include
 *  past slip costs, so scaling by them alone fed each test's mistake
 *  costs into the next test's, and a typist who leaves many errors
 *  unfixed saw their means climb without bound. A test's own clean
 *  intervals carry no slip cost, so taking the lower of the two breaks
 *  that loop, and the median ignores the odd hesitation.
 *
 *  Returns 0 before the user has a baseline (callers then keep their
 *  cold-start values), and the baseline itself when the test has too
 *  few clean intervals to judge. */
export function cleanPaceMs(
  timings: readonly KeystrokeTiming[],
  tainted: readonly boolean[],
  overallBigram: number,
  minIntervalMs: number,
): number {
  if (!(overallBigram > 0)) return 0;
  const intervals: number[] = [];
  for (let i = 1; i < timings.length; i++) {
    const a = timings[i - 1]!;
    const b = timings[i]!;
    if (a.wordIndex !== b.wordIndex) continue;
    if (!a.correct || !b.correct || tainted[i - 1] || tainted[i]) continue;
    if (a.expected.length === 0 || b.expected.length === 0) continue;
    const dt = b.t - a.t;
    if (dt >= minIntervalMs) intervals.push(dt);
  }
  if (intervals.length < MIN_PACE_INTERVALS) return overallBigram;
  return Math.min(overallBigram, median(intervals));
}

function median(values: number[]): number {
  const sorted = [...values].sort((x, y) => x - y);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}
