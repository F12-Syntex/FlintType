import type { GapClass } from "@/types/typing-analysis";

/** Every threshold of the per-test typing analysis (spec-10 §2).
 *
 *  Which numbers are absolute: every behavioural threshold is a multiple
 *  of the run's own pace, except the 2 s break floor. The other fixed
 *  numbers are measurement floors (CHUNK_MS, STATS_FLOOR_*, QUANT_*), the
 *  clock tolerance and the fade's sampling windows; none of them judges
 *  how someone types. */

/** Bump when the per-test rule changes meaning; the digest stores it. */
export const RULE_VERSION = 1;

/** No budget below this many char events (about 4 words, at any speed). */
export const MIN_KEYS = 20;
/** Clean in-word gaps needed for a "good" pace. */
export const PACE_GOOD_MIN = 15;
/** Fallback pace; the same as clean-pace.ts MIN_PACE_INTERVALS. */
export const PACE_ROUGH_MIN = 5;
/** Q40 sits within −0.2σ to +0.08σ of the fluent median for a hesitation
 *  share of 5–25% (design-science A.5). */
export const PACE_QUANTILE = 0.4;

/** Design defaults, loosely from Dhakal et al. 2018 and Gentner 1983.
 *  Used only to normalise gaps by their mechanical class. */
export const CLASS_PRIOR: Readonly<Record<GapClass, number>> = {
  cross: 1.0, hand: 1.06, finger: 1.35, repeat: 1.0, shift: 1.6, other: 1.3, plain: 1.0,
};
/** Prior fluent log spread, worth SIGMA_PRIOR_WEIGHT gaps. */
export const SIGMA_PRIOR = 0.25;
export const SIGMA_PRIOR_WEIGHT = 20;
/** About the 99th percentile of the fluent component. */
export const CATCH_Z = 2.33;
/** e^κ is clamped to this range. */
export const CATCH_MIN_FACTOR = 1.6;
export const CATCH_MAX_FACTOR = 3.0;
/** A run estimates its own class ratio from 10 or more clean gaps of that
 *  class, shrunk toward CLASS_PRIOR with the weight of 20 gaps (§5.3). */
export const CLASS_MIN = 10;
export const CLASS_PRIOR_WEIGHT = 20;
export const CLASS_RATIO_CLAMP: readonly [number, number] = [0.8, 2.5];
/** Word gaps needed to estimate P_B and σ_B from the run itself. */
export const BOUNDARY_MIN = 10;
/** Two strokes at the normal 1.2× first-letter slowing (Salthouse 1986,
 *  via St. Amant et al. 2015). Used only without enough word gaps. */
export const BOUNDARY_PRIOR = 2.4;
/** P_B is held between 2P and 3P, so a run that pauses before most words
 *  can't hide its pauses in its own "normal". */
export const BOUNDARY_CLAMP: readonly [number, number] = [2, 3];
/** β = max(BREAK_FACTOR·P, BREAK_FLOOR_MS). */
export const BREAK_FACTOR = 20;
/** The only absolute behavioural threshold: it stops fast typists' short
 *  stops from counting as breaks. */
export const BREAK_FLOOR_MS = 2000;
/** QWERTY gap classes need 95% of at least 20 letter keydowns to carry
 *  KeyboardEvent.code "Key" + the letter (§4.1). */
export const CODE_MATCH_MIN = 0.95;
export const CODE_MATCH_LETTERS = 20;

/** A gap under 3 ms on `t` is a soft-keyboard chunk or a duplicate dispatch. */
export const CHUNK_MS = 3;
/** Statistics floor for keydown gaps on a usable `ht` clock (keeps real fast rolls). */
export const STATS_FLOOR_KEY_MS = 5;
/** Otherwise the same as MIN_INTERVAL_MS. */
export const STATS_FLOOR_MS = 25;
/** Grids used by privacy-hardened browsers. */
export const QUANT_STEPS_MS: readonly number[] = [16.667, 100];
export const QUANT_TOL_MS = 0.6;
export const QUANT_SHARE = 0.8;
export const QUANT_MIN_GAPS = 30;

/** clockOk iff |R| ≤ max(CLOCK_TOL_MS, CLOCK_TOL_SHARE·T). */
export const CLOCK_TOL_MS = 50;
export const CLOCK_TOL_SHARE = 0.02;
/** Live-clone coverage guard. */
export const PARTIAL_HEAD_SHARE = 0.2;
/** Matches the live payload cap. */
export const LIVE_EVENTS_CAP = 3000;
/** Input bounds, so the engine's cost stays bounded by the payload's array
 *  lengths: a test of at most a day (the capture clock cap, CLOCK_MAX_MS
 *  in @/types/capture) and word indexes no larger than the edit and space
 *  schemas allow. Anything beyond is unusable input (analyseRun → null). */
export const MAX_DURATION_MS = 86_400_000;
export const MAX_WORD_INDEX = 100_000;
/** Replay integrity limit. */
export const V2_POS_MISMATCH_MAX = 0.02;

/** A finding needs impact ≥ max(4·P, 0.03·T): four keys' worth, and 3% of
 *  the test. For a 25-word test both are about 4–5 keys at any speed. */
export const MIN_IMPACT_KEYS = 4;
export const MIN_IMPACT_SHARE = 0.03;
/** One pause on its own needs an excess of 2·minImpact. */
export const SINGLE_PAUSE_FACTOR = 2;
/** One word holds half or more of the fixing time. */
export const WORST_WORD_SHARE = 0.5;

/** Sampling windows, not pace thresholds. */
export const FADE_MIN_MS = 30_000;
export const FADE_WINDOW_MS = 10_000;
/** Relative only. */
export const FADE_MIN_DROP = 0.05;
/** With fewer than 6 windows the drop must also be 10% or more. */
export const FADE_SHORT_DROP = 0.1;
/** The drop must be this many standard errors (one-sided, about 2.3%). */
export const FADE_Z = 2;
/** The lag-1 autocorrelation of word times used to widen the fade's
 *  standard error is clamped to [0, FADE_RHO_MAX]. */
export const FADE_RHO_MAX = 0.6;

export const STARTUP_WORDS = 4;
export const STARTUP_MIN_RUN_WORDS = 12;
/** Start-up friction needs f4 ≥ STARTUP_MIN_KEYS·P. */
export const STARTUP_MIN_KEYS = 10;
export const STARTUP_RATIO = 3;
/** Word friction is kept from WORD_FRICTION_KEYS·P (computed per run). */
export const WORD_FRICTION_KEYS = 6;
export const RCV_MIN = 60;
export const JACKKNIFE_MIN_WORDS = 10;
/** v1: a "fix" sooner than 1.5·P is a coincidence (a doubled letter). */
export const DOUBLED_GUARD = 1.5;
/** Next-word length bands: ≤ 4, 5–7, ≥ 8. */
export const LENGTH_BANDS: readonly [number, number] = [4, 7];
/** "Longer words made you pause more often" needs this many boundaries
 *  into short words to compare against. */
export const LONG_WORDS_MIN_SHORT = 3;

export const DIGEST_MAX_BYTES = 4096;
export const DIGEST_MAX_PAIRS = 16;
export const DIGEST_TRACKED = 8;
export const DIGEST_FREQUENT = 8;

export const SHIFTED_SYMBOLS = '~!@#$%^&*()_+{}|:"<>?';
