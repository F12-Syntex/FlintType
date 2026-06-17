/** Shared WPM plausibility limits (issue #38 / FT-002).
 *
 *  The leaderboard ranks rows from `adapt.submit`, which historically
 *  trusted the client's claimed wpm verbatim. These constants + helpers
 *  are the defense-in-depth layer: a hard schema ceiling (mirroring the
 *  race authority's gross-WPM cap) plus a server-side cross-check of
 *  the claimed wpm against the verifiable run payload.
 */

/** Hard ceiling on any claimed WPM figure. Mirrors the race
 *  keystroke route's gross-WPM cap (`keystrokeInputSchema` in
 *  src/types/race.ts imports this same constant) — no human input
 *  above this is credible on any surface. */
export const MAX_PLAUSIBLE_WPM = 500;

/** Below this claimed WPM the plausibility cross-check is skipped.
 *  A sub-40 wpm row is no leaderboard threat, and enforcing against
 *  sparse payloads at the low end would only risk false rejections. */
export const WPM_VERIFY_FLOOR = 40;

/** Shortest credible completed run above the verify floor. The volume
 *  ceiling is `volume × 60000 / elapsedMs`, so a vanishingly small
 *  `elapsedMs` makes it explode — a forger could pair a 1 ms elapsed
 *  with one keystroke and clear any claim (the "elapsed-compression"
 *  bypass). No honest >40-wpm completed run finishes this fast: the
 *  shortest real test (a ~10-word sprint or a short quote) takes
 *  multiple seconds even at world-record speed, so a sub-floor elapsed
 *  on a fast completed run is a fabricated timestamp pair, not a sprint. */
export const MIN_COMPLETED_RUN_MS = 500;

/** Headroom multiplier on the volume-derived ceiling. Net WPM counts
 *  word-separator spaces that may not appear in the keystroke stream
 *  (~+20% for 5-char words), and rounding/clock skew adds a little
 *  more — 1.5× absorbs all of that while still rejecting claims that
 *  exceed what the submitted payload could physically produce. */
export const WPM_VOLUME_TOLERANCE = 1.5;

/** Verifiable typed-character volume of a submitted run: the count of
 *  real keystroke entries in the timing stream — and ONLY that.
 *
 *  The earlier implementation took `max(timings.length, passageChars)`,
 *  but the passage char count is derived from the client-controlled
 *  `words` array, which is never verified against a server-served
 *  passage (issue #38). A forger could therefore pad `words` with a
 *  long fabricated array, inflate the volume, and clear the ceiling
 *  while submitting an empty `timings` stream — POSTing one inflated
 *  number. Deriving the ceiling exclusively from `timings` removes that
 *  bypass: the keystroke stream is the only part of the payload whose
 *  internal structure we can cross-check (`t` monotonic, within elapsed
 *  — see `timingsConsistent`). With `timings: []` the volume is 0, the
 *  ceiling is 0, and any wpm above the verify floor is rejected. A
 *  forger must now fabricate a full, internally-consistent keystroke
 *  stream — see the residual-risk note in `submit.ts`. */
export function submittedCharVolume(timings: readonly unknown[]): number {
  return timings.length;
}

/** Upper-bound credible WPM for a run: `charVolume` characters over
 *  `elapsedMs` wall-clock, in standard 5-char words, with
 *  WPM_VOLUME_TOLERANCE headroom. Returns 0 for non-positive elapsed. */
export function maxCredibleWpm(charVolume: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return 0;
  return (charVolume / 5) * (60_000 / elapsedMs) * WPM_VOLUME_TOLERANCE;
}

/** Slack on the "no keystroke after the run ended" rule. The finishing
 *  keystroke's `t` equals the run's elapsed almost exactly (both are
 *  `now − startTime`); this absorbs clock skew and the gap between the
 *  last keystroke and the captured `completedAt`. */
export const TIMING_FUTURE_TOLERANCE_MS = 2_000;

/** Slack on monotonicity. The legit client appends keystrokes in time
 *  order, so `t` is non-decreasing by construction; a small backward
 *  step is tolerated for wall-clock (`Date.now`) adjustments. */
export const TIMING_BACKWARD_TOLERANCE_MS = 1_000;

/** Cross-check a completed run's keystroke stream against its elapsed
 *  wall-clock. Every `t` is ms-since-start, so a consistent stream has
 *  all `t` values finite, non-negative, no later than `elapsedMs` (plus
 *  a little skew), and roughly monotonic. A forger who supplies a
 *  timings array padded with garbage `t` values (e.g. all zero, or
 *  values beyond the claimed elapsed) fails here, so a fabricated
 *  stream has to look like a real one to pass. An empty stream is
 *  vacuously consistent — it's the volume ceiling (0) that rejects it. */
export function timingsConsistent(
  timings: readonly { readonly t: number }[],
  elapsedMs: number,
): boolean {
  let highWater = 0;
  for (const entry of timings) {
    const t = entry.t;
    if (!Number.isFinite(t) || t < 0) return false;
    if (t > elapsedMs + TIMING_FUTURE_TOLERANCE_MS) return false;
    if (t < highWater - TIMING_BACKWARD_TOLERANCE_MS) return false;
    if (t > highWater) highWater = t;
  }
  return true;
}

/** The span of a keystroke stream — its latest `t`, i.e. ms from the
 *  first keystroke to the last. 0 for an empty stream. This is the
 *  window the keystrokes *actually* occupy, independent of the claimed
 *  `elapsedMs`. For a legit completed run it equals the elapsed (the
 *  finishing keystroke's `t` is `endTime − startTime`); for a stream
 *  padded with all-equal `t` it stays near 0 however long the run is
 *  claimed to be. */
export function keystrokeSpanMs(
  timings: readonly { readonly t: number }[],
): number {
  let maxT = 0;
  for (const entry of timings) if (entry.t > maxT) maxT = entry.t;
  return maxT;
}

/** The stream's intrinsic typing rate: `volume` characters over the
 *  span the keystrokes themselves cover (`spanMs`), as a raw-WPM
 *  equivalent. A legit stream's rate is just the user's real raw speed
 *  — always well under the human cap, with extra headroom because
 *  `volume` excludes spaces. A fabricated stream that packs its volume
 *  into a thin time slice (all-equal `t`, or a tiny claimed elapsed
 *  forcing a tiny span) reports an impossibly high rate. Returns
 *  Infinity for a positive volume in a zero span (keystrokes claimed to
 *  happen in an instant) and 0 for an empty stream. This is what closes
 *  the two padding bypasses the volume-over-elapsed ceiling alone
 *  missed: the ceiling can be cleared by inflating `volume` or shrinking
 *  `elapsedMs`, but neither is free once the keystrokes must also be
 *  humanly *paced* across their own span. */
export function keystrokeRateWpm(volume: number, spanMs: number): number {
  if (volume <= 0) return 0;
  if (spanMs <= 0) return Infinity;
  return (volume / 5) * (60_000 / spanMs);
}
