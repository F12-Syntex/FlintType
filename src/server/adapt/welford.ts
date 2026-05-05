/** Incremental running statistics for a single (bigram | trigram |
 *  motor-feature). Mean is updated via an exponentially-weighted
 *  moving average with an adaptive learning rate; variance follows
 *  the same weighting so the two stay self-consistent.
 *
 *  Why EWMA over plain Welford-of-the-whole-sequence: keystroke
 *  timings drift over weeks (the user gets faster). A pure mean
 *  averages today's keystrokes with measurements from a year ago.
 *  EWMA with a learning-rate floor lets old measurements decay
 *  while still tracking long-term consistency. */
export type ModelState = {
  mean: number;
  variance: number;
  n: number;
};

/** Floor on the learning rate. Even after thousands of samples, each
 *  new measurement nudges the mean by at least 2% — without this, an
 *  established pattern becomes uneditable and the algorithm stops
 *  reacting to the user's improvements. */
export const ALPHA_FLOOR = 0.02;

/** Cap so a brand-new pattern doesn't fully overwrite the seed on
 *  its second sample (which would make variance estimation noisy). */
export const ALPHA_CAP = 0.5;

/** Learning rate as a function of sample count. Naive `1 / (n + 1)`
 *  decays toward zero; clamping to [floor, cap] gives the spec'd
 *  "aggressive at first, gentle later, never zero" behaviour. */
export function learningRate(n: number): number {
  if (n < 0) return ALPHA_CAP;
  const naive = 1 / (n + 1);
  return Math.max(ALPHA_FLOOR, Math.min(ALPHA_CAP, naive));
}

/** Seed a brand-new pattern from its first observation. Variance
 *  starts at 0 — it grows naturally as further samples arrive. */
export function seed(sample: number): ModelState {
  return { mean: sample, variance: 0, n: 1 };
}

/** Apply a single sample. Returns the next state; the input is not
 *  mutated. The variance update uses the new mean (delta2) so the
 *  estimator stays consistent with the EWMA mean. */
export function update(state: ModelState, sample: number): ModelState {
  const alpha = learningRate(state.n);
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

/** Apply many samples in order, starting from an existing state (or
 *  seeded from the first sample if `state` is null). */
export function updateMany(
  state: ModelState | null,
  samples: readonly number[],
): ModelState | null {
  if (samples.length === 0) return state;
  let s = state ?? seed(samples[0]!);
  const start = state == null ? 1 : 0;
  for (let i = start; i < samples.length; i++) {
    s = update(s, samples[i]!);
  }
  return s;
}

/** Confidence in the running mean as a value in [0, 1]. Saturates
 *  once enough samples have accumulated; before then, it scales
 *  linearly with sample count. The cap is the point past which more
 *  samples don't materially improve the estimate. */
export const CONFIDENCE_SATURATION = 30;

export function confidence(n: number): number {
  if (n <= 0) return 0;
  return Math.min(1, n / CONFIDENCE_SATURATION);
}
