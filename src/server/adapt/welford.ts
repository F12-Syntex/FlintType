/** Incremental running statistics for a single (bigram | trigram |
 *  motor-feature | word). Mean is updated via an exponentially-weighted
 *  moving average with an adaptive learning rate; variance follows
 *  the same weighting so the two stay self-consistent.
 *
 *  Why EWMA over plain Welford-of-the-whole-sequence: keystroke
 *  timings drift over weeks (the user gets faster). A pure mean
 *  averages today's keystrokes with measurements from a year ago.
 *  EWMA with a learning-rate floor lets old measurements decay
 *  while still tracking long-term consistency.
 *
 *  Two refinements make improvement show up quickly without making
 *  stable estimates jumpy:
 *   - **Staleness.** A state that hasn't been sampled for weeks has
 *     its prior weight decayed (`stalenessFactor`), so the first new
 *     samples after a break re-learn the pattern fast.
 *   - **Shift detection.** When a test's clean samples sit far outside
 *     what ordinary noise explains (`detectShift`), the prior counts
 *     no more than the batch for that test, so a genuinely fixed (or
 *     newly broken) pattern registers within a test or two instead of
 *     a few dozen, while one test can never move the mean more than
 *     half of the way. */
export type ModelState = {
  mean: number;
  variance: number;
  n: number;
  /** Epoch ms of the last sample folded into this state (the model
   *  row's `updatedAt`). Optional: absent on freshly-built states and
   *  in tests, where staleness is simply not applied. */
  lastSeenMs?: number;
};

/** Floor on the learning rate. Even after thousands of samples, each
 *  new measurement nudges the mean by at least 5%. Raised from 2%:
 *  at 2% a drilled pattern the user had genuinely fixed kept scoring
 *  as weak for ~30 more tests (the mean needed ~100 samples to move),
 *  so adaptive practice kept serving it long after it stopped being a
 *  problem. 5% keeps a ~39-sample memory: still smooth (standard
 *  error ≈ 5% of the mean for typical keystroke noise) but responsive. */
export const ALPHA_FLOOR = 0.05;

/** Cap so a brand-new pattern doesn't fully overwrite the seed on
 *  its second sample (which would make variance estimation noisy). */
export const ALPHA_CAP = 0.5;

/** Effective sample size of an EWMA running at the floor rate —
 *  (2 − α) / α. Past this many samples, more history doesn't make the
 *  mean any more certain, because the oldest samples have decayed out.
 *  Evidence weighting (`evidence.ts`) caps sample counts here. */
export const EWMA_MEMORY = (2 - ALPHA_FLOOR) / ALPHA_FLOOR;

/** Learning rate as a function of (effective) sample count. Naive
 *  `1 / (n + 1)` decays toward zero; clamping to [floor, cap] gives
 *  the spec'd "aggressive at first, gentle later, never zero"
 *  behaviour. Accepts fractional `n` (decayed / shift-reset priors). */
export function learningRate(n: number): number {
  if (n < 0) return ALPHA_CAP;
  const naive = 1 / (n + 1);
  return Math.max(ALPHA_FLOOR, Math.min(ALPHA_CAP, naive));
}

/** Half-life, in days, of the weight a state's history carries. A
 *  pattern unseen for three weeks counts as half as many samples —
 *  both when new samples arrive (it re-learns faster) and when it is
 *  scored (its weakness is trusted less, and it drifts back toward
 *  exploration so it gets re-measured). */
export const STALENESS_HALF_LIFE_DAYS = 21;
const DAY_MS = 86_400_000;

/** Days since `lastSeenMs`, or 0 when either side is unknown. Clamped
 *  at 0 so a clock-skewed future timestamp never inflates weight. */
export function staleDays(
  lastSeenMs: number | undefined,
  nowMs: number | undefined,
): number {
  if (lastSeenMs == null || nowMs == null) return 0;
  if (!Number.isFinite(lastSeenMs) || !Number.isFinite(nowMs)) return 0;
  return Math.max(0, (nowMs - lastSeenMs) / DAY_MS);
}

/** Multiplier in (0, 1] applied to a state's sample count after
 *  `days` without practice. */
export function stalenessFactor(days: number): number {
  if (!(days > 0)) return 1;
  return 0.5 ** (days / STALENESS_HALF_LIFE_DAYS);
}

/** Shift detection — a test-level check for "this pattern's real speed
 *  has moved", so a genuinely fixed (or newly broken) pattern registers
 *  within a test or two instead of waiting out the ~39-sample memory.
 *
 *  Keystroke latencies are right-skewed (roughly lognormal) and vary a
 *  little from test to test even when nothing has changed (warm-up,
 *  keyboard, posture), so a plain z-test of the batch mean against the
 *  stored mean fires on ordinary noise. The test therefore runs on
 *  log(ms) and its error bar has three parts:
 *   - the batch's own sampling noise (logVar / k),
 *   - the stored mean's uncertainty (logVar / min(n, EWMA_MEMORY)),
 *   - ordinary test-to-test spread (`SHIFT_TEST_SPREAD`, in log units).
 *  The batch must sit `SHIFT_Z` of those away. Simulated against
 *  stationary lognormal typists (σ = 0.25, per-test spread up to 4%) the
 *  false-alarm rate stays under 0.5% per pattern per test for 3–20
 *  sample batches (≤ 3% even with an extreme 8% per-test spread),
 *  while a 25–40% speed change is still caught in a test or two.
 *
 *  A batch needs at least `SHIFT_MIN_BATCH` samples and the prior at
 *  least `SHIFT_MIN_PRIOR` before the test is meaningful. */
export const SHIFT_MIN_BATCH = 3;
export const SHIFT_MIN_PRIOR = 10;
export const SHIFT_Z = 3;
/** Ordinary test-to-test spread of a pattern's typical time, in log
 *  units (≈ 5%). Makes the test robust to session effects: a shift has
 *  to beat normal day-to-day variation, not just sampling noise. */
export const SHIFT_TEST_SPREAD = 0.05;
/** On a detected shift the prior counts as max(SHIFT_RESET_N, batch
 *  size) samples, so one test moves the mean at most half of the way to
 *  its new level (3 samples: 37.5%, 10 samples: 50%) and a false alarm
 *  can't wipe a pattern's memory. Without a shift the floor rate moves
 *  a settled mean ~14% (3 samples) to ~40% (10 samples) of the way;
 *  past ~19 samples the floor rate alone moves it further than half
 *  (64% at 20), and a shift adds nothing on top. */
export const SHIFT_RESET_N = 5;

/** True when `batch` (clean samples from one test) is strong evidence
 *  that the pattern's true speed has moved away from `state.mean`.
 *  `priorN` is the prior's (staleness-adjusted) sample count. */
export function detectShift(
  state: ModelState,
  batch: readonly number[],
  priorN: number = state.n,
): boolean {
  if (priorN < SHIFT_MIN_PRIOR) return false;
  if (!(state.mean > 0) || !(state.variance > 0)) return false;
  let sum = 0;
  let k = 0;
  for (const v of batch) {
    if (!(v > 0)) continue;
    sum += Math.log(v);
    k++;
  }
  if (k < SHIFT_MIN_BATCH) return false;
  // Lognormal moments: the stored (arithmetic) mean and variance imply
  // a log-scale variance and a log-scale mean below log(mean).
  const logVar = Math.log(1 + state.variance / (state.mean * state.mean));
  const priorLogMean = Math.log(state.mean) - logVar / 2;
  const se = Math.sqrt(
    logVar / k +
      logVar / Math.min(priorN, EWMA_MEMORY) +
      SHIFT_TEST_SPREAD * SHIFT_TEST_SPREAD,
  );
  return Math.abs(sum / k - priorLogMean) >= SHIFT_Z * se;
}

/** Seed a brand-new pattern from its first observation. Variance
 *  starts at 0 — it grows naturally as further samples arrive. */
export function seed(sample: number): ModelState {
  return { mean: sample, variance: 0, n: 1 };
}

/** Apply a single sample. Returns the next state; the input is not
 *  mutated. The variance update uses the new mean (delta2) so the
 *  estimator stays consistent with the EWMA mean. `rateN` overrides
 *  the sample count used to pick the learning rate (decayed or
 *  shift-reset priors); the stored count always advances by one. */
export function update(
  state: ModelState,
  sample: number,
  rateN: number = state.n,
): ModelState {
  const alpha = learningRate(rateN);
  const delta = sample - state.mean;
  const newMean = state.mean + alpha * delta;
  const delta2 = sample - newMean;
  const newVariance =
    (1 - alpha) * state.variance + alpha * delta * delta2;
  return {
    mean: newMean,
    variance: Math.max(0, newVariance),
    n: state.n + 1,
  };
}

export type UpdateOptions = {
  /** Days since the state last received a sample — decays the prior's
   *  weight (see `stalenessFactor`). */
  staleDays?: number;
  /** The samples to run shift detection against. Defaults to
   *  `samples`. Callers folding in synthetic samples (mistake costs)
   *  pass only the clean timings here so a burst of slips can't
   *  masquerade as a change in typing speed. */
  shiftEvidence?: readonly number[];
};

/** Apply many samples in order, starting from an existing state (or
 *  seeded from the first sample if `state` is null). */
export function updateMany(
  state: ModelState | null,
  samples: readonly number[],
  opts: UpdateOptions = {},
): ModelState | null {
  if (samples.length === 0) return state;
  if (state == null) {
    let s = seed(samples[0]!);
    for (let i = 1; i < samples.length; i++) s = update(s, samples[i]!);
    return s;
  }
  let rateN = state.n * stalenessFactor(opts.staleDays ?? 0);
  if (detectShift(state, opts.shiftEvidence ?? samples, rateN)) {
    rateN = Math.min(rateN, Math.max(SHIFT_RESET_N, samples.length));
  }
  let s: ModelState = { mean: state.mean, variance: state.variance, n: state.n };
  for (const v of samples) {
    s = update(s, v, rateN);
    rateN += 1;
  }
  return s;
}

/** Confidence in the running mean as a value in [0, 1]. Saturates
 *  once enough samples have accumulated; before then, it scales
 *  linearly with sample count. Kept for display callers; weakness
 *  scoring uses the smoother Bayesian `evidenceWeight` instead. */
export const CONFIDENCE_SATURATION = 30;

export function confidence(n: number): number {
  if (n <= 0) return 0;
  return Math.min(1, n / CONFIDENCE_SATURATION);
}
