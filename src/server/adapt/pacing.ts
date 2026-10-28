import type { TestRow } from "@/types/adapt";
import { sessionSignals } from "./session-form";

/** Difficulty pacing — how hard the next passage should be, given how
 *  the user is doing *right now*.
 *
 *  Before this module, "fatigue" was a [0.9, 1] multiplier applied to
 *  every candidate's weight. Because it scaled every candidate by the
 *  same constant, the weighted pick was unchanged: tiredness had no
 *  effect at all. Pacing instead changes the *shape* of the selection:
 *
 *   - the challenge band's ceiling (how much slower than your baseline
 *     a word may be predicted to take) drops when you're tired or
 *     error-prone and rises a little when you're in form;
 *   - the weakness concentration exponent softens when you're
 *     struggling (spread practice over moderate weaknesses rather than
 *     hammering the worst ones) and sharpens when you're fresh.
 *
 *  Signals come from the recent test stream (`session-form.ts`): the
 *  WPM trend within the current session (fatigue), session accuracy vs
 *  your usual accuracy (strain), and session speed vs your usual speed
 *  (slump / good form) — always comparing like with like, so switching
 *  modes or test lengths never reads as being tired. */

/** Challenge band: words whose predicted time lands in
 *  [baseline × LOW, baseline × high] are the productive zone. See
 *  `inChallengeBand`. HIGH is the neutral ceiling; pacing moves it
 *  between HIGH_TIRED and HIGH_FRESH. The neutral 2.6× is deliberately
 *  generous: adaptive mode exists to serve your *worst* words, which
 *  predict well past your average (an earlier 1.6× ceiling silently
 *  excluded them and made the mode feel too easy), while still keeping
 *  the pathological 3×+ outliers out. */
export const CHALLENGE_LOW = 1.05;
export const CHALLENGE_HIGH = 2.6;
export const CHALLENGE_HIGH_TIRED = 1.9;
export const CHALLENGE_HIGH_FRESH = 3.0;

/** Exponent applied to a candidate's weakness score before the
 *  weighted-random pick. The raw score is roughly linear in "how much
 *  slower than baseline this word is", so a flat pick over ~200
 *  candidates barely concentrates on the weakest; > 1 sharpens it so
 *  your actual worst words dominate (at 1.8 a word 3× weaker is ~7× as
 *  likely). Pacing moves it between TIRED (spread out) and FRESH. */
export const WEAKNESS_CONCENTRATION = 1.8;
export const CONCENTRATION_TIRED = 1.3;
export const CONCENTRATION_FRESH = 2.1;

/** Good form is capped well below the strain range: being in form
 *  should stretch you a little, never make practice brutal. */
export const FORM_MAX = 0.5;

/** Recent tests read for pacing: enough for a session plus a "usual"
 *  reference per kind of run (see `session-form.ts`). Every caller —
 *  `adapt.words`, `adapt.scoreWord`, `adapt.snapshot` — reads exactly
 *  this many so they all see the same pacing. */
export const PACING_TESTS = 30;

export type Pacing = {
  /** −1 (tired / struggling) … FORM_MAX (in form). 0 = neutral. */
  form: number;
  /** Upper bound of the challenge band for this request. */
  challengeHigh: number;
  /** Weakness concentration exponent for this request. */
  concentration: number;
  /** challengeHigh / CHALLENGE_HIGH capped at 1 — the "easing off"
   *  figure the /biogram overview shows. */
  damping: number;
};

export const NEUTRAL_PACING: Pacing = {
  form: 0,
  challengeHigh: CHALLENGE_HIGH,
  concentration: WEAKNESS_CONCENTRATION,
  damping: 1,
};

/** Derive this request's pacing from the newest-first test stream
 *  (pass the newest `PACING_TESTS`). */
export function pacingFrom(
  recent: readonly TestRow[],
  nowMs?: number,
): Pacing {
  const { fatigue, strain, slump, lift } = sessionSignals(recent, nowMs);
  const struggle = Math.max(fatigue, strain, slump);
  const form = struggle > 0 ? -struggle : lift * FORM_MAX;
  return pacingForForm(form);
}

/** Map a form value onto band ceiling + concentration. Exported so the
 *  mapping is testable on its own. */
export function pacingForForm(form: number): Pacing {
  const f = Math.max(-1, Math.min(FORM_MAX, form));
  if (f === 0) return NEUTRAL_PACING;
  const t = f < 0 ? -f : f / FORM_MAX;
  const challengeHigh =
    f < 0
      ? lerp(CHALLENGE_HIGH, CHALLENGE_HIGH_TIRED, t)
      : lerp(CHALLENGE_HIGH, CHALLENGE_HIGH_FRESH, t);
  const concentration =
    f < 0
      ? lerp(WEAKNESS_CONCENTRATION, CONCENTRATION_TIRED, t)
      : lerp(WEAKNESS_CONCENTRATION, CONCENTRATION_FRESH, t);
  return {
    form: f,
    challengeHigh,
    concentration,
    damping: Math.min(1, challengeHigh / CHALLENGE_HIGH),
  };
}

/** Challenge-band gate. Words whose predicted typing time falls in
 *  [baseline × low, baseline × high] (per bigram) are the productive
 *  zone — slower than your average, not so slow you stall. Cold start
 *  (no baseline) and zero-bigram words always pass. */
export function inChallengeBand(
  predictedMs: number,
  userBaselineMsPerBigram: number,
  bigramCount: number,
  high: number = CHALLENGE_HIGH,
  low: number = CHALLENGE_LOW,
): boolean {
  if (bigramCount === 0 || userBaselineMsPerBigram === 0) return true;
  const expected = userBaselineMsPerBigram * bigramCount;
  if (expected === 0) return true;
  const ratio = predictedMs / expected;
  return ratio >= low && ratio <= high;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
