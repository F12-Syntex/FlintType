import {
  EWMA_MEMORY,
  type ModelState,
  staleDays,
  stalenessFactor,
} from "./welford";

/** How much the algorithm trusts what it has measured about a pattern.
 *
 *  Weakness used to be `gap × min(1, n / 30)` behind a hard
 *  `n < 3 → 0` cutoff, with a flat exploration bonus that switched off
 *  the moment a pair hit three samples. Patterns therefore jumped in
 *  and out of the selector. This module replaces that with two smooth
 *  curves over one shared notion of "effective samples":
 *
 *   - `evidenceWeight` — Bayesian shrinkage. A pattern's estimated gap
 *     to the baseline is pulled toward 0 (the baseline) by a prior worth
 *     `SHRINKAGE_PRIOR` samples, so one slow sample nudges it slightly
 *     and thirty make it count. No cliff.
 *   - `exploreWeight` — the share of the "go measure this" bonus a
 *     pattern still earns. Full for an unseen pattern, fading linearly
 *     to 0 by `EXPLORE_SAMPLES`, so measurement hands over to weakness
 *     scoring gradually.
 *
 *  Weakness also only counts the part of a gap we're confident about:
 *  `standardError` (from the variance the model already stores) is
 *  subtracted first. A normal pair whose mean was bumped by one random
 *  mistake has a wide error bar and scores ~0; a consistently slow or
 *  consistently fumbled pair keeps nearly all of its gap. In simulation
 *  this stopped practice leaking onto noise and back onto real
 *  weaknesses.
 *
 *  Effective samples decay with time since the pattern was last typed
 *  (`STALENESS_HALF_LIFE_DAYS`), so an old estimate is trusted less and
 *  a long-unseen pattern slides back toward exploration and gets
 *  re-checked. */

/** Prior strength, in samples, of the baseline in the shrinkage
 *  estimate. With 5, a pattern's gap counts ~17% after one sample,
 *  50% after five, ~85% at the EWMA memory cap. */
export const SHRINKAGE_PRIOR = 5;

/** Samples after which a pattern no longer earns any exploration
 *  bonus. Twice the old hard cutoff (3) so the hand-over is a ramp. */
export const EXPLORE_SAMPLES = 6;

/** Sample count adjusted for staleness. `nowMs` omitted → no decay
 *  (display callers that only care about the estimate itself). */
export function effectiveSamples(state: ModelState, nowMs?: number): number {
  return state.n * stalenessFactor(staleDays(state.lastSeenMs, nowMs));
}

/** Shrinkage factor n / (n + k) with n capped at the EWMA memory:
 *  past that many samples the running mean is no more certain, so
 *  piling up counts must not keep raising trust. */
export function evidenceWeight(nEff: number): number {
  if (!(nEff > 0)) return 0;
  const n = Math.min(nEff, EWMA_MEMORY);
  return n / (n + SHRINKAGE_PRIOR);
}

/** Fraction of the exploration bonus still earned at `nEff` samples. */
export function exploreWeight(nEff: number): number {
  if (!(nEff > 0)) return 1;
  return Math.max(0, 1 - nEff / EXPLORE_SAMPLES);
}

/** Standard errors subtracted from a gap before it counts as weakness. */
export const WEAKNESS_CONFIDENCE_Z = 1;

/** Standard error of the running mean: √(variance / n), with n capped
 *  at the EWMA memory (older samples have decayed out) and floored at 1. */
export function standardError(state: ModelState, nEff: number): number {
  const n = Math.max(1, Math.min(nEff, EWMA_MEMORY));
  return Math.sqrt(Math.max(0, state.variance) / n);
}
