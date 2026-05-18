/** Roll-up stats derived from a run's per-second WPM history. Shared
 *  by the post-test summary (live view) and the practice-state submit
 *  effect (persisted on the test row so the share card can show the
 *  same numbers the user saw). Pure functions over a tiny shape so
 *  they're trivial to test and trivial to render. */

export type WpmSample = {
  /** ms since the first keystroke. */
  t: number;
  wpm: number;
  raw: number;
};

/** Structural minimum each stat helper needs from a sample. Lets the
 *  helpers serve both the persisted WpmSample shape (`{ t, wpm, raw }`)
 *  and the live chart's Bucket shape (`{ sec, wpm, raw }`) without a
 *  conversion layer at every call site. */
type WithWpm = { readonly wpm: number };

export function peakWpm(samples: readonly WithWpm[]): number {
  return samples.reduce((m, s) => (s.wpm > m ? s.wpm : m), 0);
}

export function avgWpm(samples: readonly WithWpm[]): number {
  if (samples.length === 0) return 0;
  return samples.reduce((sum, s) => sum + s.wpm, 0) / samples.length;
}

/** Lowest WPM in the run — the "stall" point. Returns 0 for empty
 *  input so the share card renders `0` instead of NaN. */
export function stallWpm(samples: readonly WithWpm[]): number {
  if (samples.length === 0) return 0;
  return samples.reduce((m, s) => (s.wpm < m ? s.wpm : m), samples[0]!.wpm);
}

/** Consistency score 0–100. 100 = constant WPM; lower = more variance.
 *  Implementation: coefficient of variation flipped onto a 0..1 scale
 *  and rounded to a percent. Matches the rendering on the live
 *  TestSummary stat row. */
export function consistencyScore(samples: readonly WithWpm[]): number {
  if (samples.length < 2) return 100;
  const avg = avgWpm(samples);
  if (avg === 0) return 0;
  const variance =
    samples.reduce((s, b) => s + (b.wpm - avg) ** 2, 0) / samples.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / avg;
  return Math.max(0, Math.min(100, Math.round(100 * (1 - cv))));
}
