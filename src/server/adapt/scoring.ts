import type { HandLayoutPrefs } from "@/lib/hand-layout";
import type { TestRow } from "@/types/adapt";
import {
  type BigramCategory,
  bigramCategory,
  deriveFeatureKeys,
} from "./motor-features";
import { confidence, type ModelState } from "./welford";

/** Patterns with fewer than this many samples don't contribute to
 *  weakness scoring — confidence is too low to act on. They still
 *  collect samples in the background so the threshold is eventually
 *  crossed. */
export const MIN_SAMPLES_FOR_WEAKNESS = 3;

/** Bonus added to a word's bigram-weakness sum for every bigram in
 *  the word that has fewer than `MIN_SAMPLES_FOR_WEAKNESS` samples.
 *  The algorithm is otherwise blind to "untested" bigrams (their
 *  weakness is 0 by definition) so words full of unsampled pairs are
 *  ignored even though they're the highest-information words to
 *  serve. 80 (ms-equivalent units) is comparable to the weakness of
 *  a moderately weak warm bigram, so untested bigrams compete with
 *  weak ones rather than being free-priority above them. */
export const UNTESTED_BIGRAM_BONUS = 80;

/** α / β / γ in the spec, plus δ — the per-word term. The first three
 *  attribute weakness to mechanical units (bigrams, trigrams, motor
 *  features); δ adds a sequence-level term that asks "is the user
 *  consistently slow on this whole word, beyond what its bigrams
 *  predict?". A word with average bigrams but a slow whole-word mean
 *  has a hidden friction (memory, context-switch, even spelling
 *  hesitation) that the per-pair signal can't see. */
export type ScoringWeights = {
  alpha: number;
  beta: number;
  gamma: number;
  delta: number;
};

/** Default weighting. The mechanical terms (α/β/γ) stay at 1 so their
 *  relative contributions match the original spec. δ — the per-word
 *  term — is pulled up to 2.0 because words are the unit users actually
 *  type: a confident measurement against the whole word captures the
 *  cognitive friction (memory, context-switch, spelling hesitation)
 *  that no per-pair signal can see. The `weakness()` helper still
 *  scales δ by `confidence(n)` per word, so untrained words don't
 *  overpower the bigram aggregate — the bump only applies once we
 *  actually have data on the word. */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  alpha: 1,
  beta: 1,
  gamma: 1,
  delta: 2,
};

export type ModelMap = ReadonlyMap<string, ModelState>;

/** Sample-count-weighted mean across every state in the map. Used as
 *  the user's overall baseline for a given pattern type — the
 *  reference each individual pattern's mean is compared against. */
export function baselineMean(models: ModelMap): number {
  if (models.size === 0) return 0;
  let totalSamples = 0;
  let totalSum = 0;
  for (const st of models.values()) {
    totalSamples += st.n;
    totalSum += st.mean * st.n;
  }
  return totalSamples > 0 ? totalSum / totalSamples : 0;
}

/** weakness = max(0, mean - baseline) × confidence(n).
 *  Faster-than-baseline patterns score 0 — we never train strengths. */
export function weakness(state: ModelState, baseline: number): number {
  if (state.n < MIN_SAMPLES_FOR_WEAKNESS) return 0;
  const gap = Math.max(0, state.mean - baseline);
  return gap * confidence(state.n);
}

/** Per-category bigram baselines plus the legacy overall mean.
 *  Each per-category number is the sample-weighted mean of bigram
 *  means in that category — i.e. the user's typical time for that
 *  *kind* of bigram. Comparing each pair against its own category
 *  baseline rather than the global average prevents inherently slow
 *  motions (same-finger pairs like "lo", same-hand jumps) from being
 *  misread as personal weaknesses.
 *
 *  Categories with no samples fall back to `overall` so newly-warm
 *  users still get a coherent baseline rather than 0. */
export type BigramBaselines = {
  sameFinger: number;
  sameHand: number;
  crossHand: number;
  /** Used for digits / unmapped chars / disabled-finger pairs. */
  unknown: number;
  /** Sample-weighted across every category. Used by callers that
   *  genuinely need a single number — predictedWordMs's cold-bigram
   *  fallback for ambiguous keys, the snapshot output's `bigram`
   *  field, the challenge-band gate. */
  overall: number;
};

/** Partition the bigram model by mechanical category and compute a
 *  sample-weighted mean per bucket. Layout matters because
 *  `bigramCategory` reads the user's finger map to decide which
 *  finger types each char. */
export function bigramBaselines(
  models: ModelMap,
  layout: HandLayoutPrefs,
): BigramBaselines {
  const buckets: Record<BigramCategory, { sum: number; n: number }> = {
    "same-finger": { sum: 0, n: 0 },
    "same-hand": { sum: 0, n: 0 },
    "cross-hand": { sum: 0, n: 0 },
    unknown: { sum: 0, n: 0 },
  };
  let totalSum = 0;
  let totalN = 0;
  for (const [key, st] of models) {
    if (key.length !== 2) continue;
    const cat = bigramCategory(key[0]!, key[1]!, layout);
    buckets[cat].sum += st.mean * st.n;
    buckets[cat].n += st.n;
    totalSum += st.mean * st.n;
    totalN += st.n;
  }
  const overall = totalN > 0 ? totalSum / totalN : 0;
  const meanOr = (b: { sum: number; n: number }): number =>
    b.n > 0 ? b.sum / b.n : overall;
  return {
    sameFinger: meanOr(buckets["same-finger"]),
    sameHand: meanOr(buckets["same-hand"]),
    crossHand: meanOr(buckets["cross-hand"]),
    unknown: meanOr(buckets.unknown),
    overall,
  };
}

/** Resolve the right baseline for a bigram's mechanical category. */
export function baselineForCategory(
  category: BigramCategory,
  baselines: BigramBaselines,
): number {
  switch (category) {
    case "same-finger":
      return baselines.sameFinger;
    case "same-hand":
      return baselines.sameHand;
    case "cross-hand":
      return baselines.crossHand;
    case "unknown":
      return baselines.unknown;
  }
}

/** Pulls a single number out of the recent test stream that says
 *  "the user is fading". Returns a multiplier in [0.9, 1.0] — when
 *  multiplied into weakness, it scales the algorithm's appetite for
 *  hard patterns down by up to 10% on tired sessions. */
export const FATIGUE_MIN_MULT = 0.9;
export const FATIGUE_TESTS = 5;

export function fatigueDampener(recent: readonly TestRow[]): number {
  if (recent.length < FATIGUE_TESTS) return 1;
  const slice = recent.slice(0, FATIGUE_TESTS);
  // Slope of WPM by index. recent[0] is newest, recent[N-1] oldest.
  const newestAvg =
    slice
      .slice(0, Math.ceil(FATIGUE_TESTS / 2))
      .reduce((a, t) => a + t.wpm, 0) / Math.ceil(FATIGUE_TESTS / 2);
  const olderAvg =
    slice
      .slice(Math.ceil(FATIGUE_TESTS / 2))
      .reduce((a, t) => a + t.wpm, 0) /
    (FATIGUE_TESTS - Math.ceil(FATIGUE_TESTS / 2));
  if (olderAvg <= 0) return 1;
  const decline = (olderAvg - newestAvg) / olderAvg;
  if (decline <= 0) return 1;
  // 0% decline → 1.0, 10% or more decline → 0.9. Linear in between.
  const scaled = 1 - Math.min(0.1, decline);
  return Math.max(FATIGUE_MIN_MULT, scaled);
}

/** Per-word predicted typing time, used by the challenge-band
 *  sampler. Sums bigram means within the word. Cold bigrams fall
 *  back to the *category* baseline so an unsampled doubled letter
 *  is predicted to take roughly as long as the user's other doubled
 *  letters, rather than the global average (which would make
 *  doubled-heavy words look easier than they really are). */
export function predictedWordMs(
  word: string,
  bigramModels: ModelMap,
  baselines: BigramBaselines,
  layout: HandLayoutPrefs,
): number {
  if (word.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < word.length; i++) {
    const a = word[i - 1]!.toLowerCase();
    const b = word[i]!.toLowerCase();
    const key = a + b;
    const st = bigramModels.get(key);
    if (st) {
      total += st.mean;
    } else {
      total += baselineForCategory(bigramCategory(a, b, layout), baselines);
    }
  }
  return total;
}

/** Word score per the spec: Σ-of-bigram-weakness + Σ-of-trigram-weakness +
 *  Σ-of-motor-feature-weakness + word-level-weakness, weighted by α
 *  / β / γ / δ. Each unique motor-feature key contributes once even
 *  if it's emitted by several bigrams in the word — otherwise long
 *  words full of same-finger pairs would explode the score. The
 *  word-level term reads from `wordModels` when given; without it
 *  scoreWord behaves exactly as it did before the word model
 *  shipped. */
export function scoreWord(args: {
  word: string;
  bigramModels: ModelMap;
  trigramModels: ModelMap;
  motorFeatureModels: ModelMap;
  /** Optional per-word running stats. When provided, contributes a
   *  word-level weakness term keyed on the lowercase word. */
  wordModels?: ModelMap;
  layout: HandLayoutPrefs;
  baselines: {
    bigram: BigramBaselines;
    trigram: number;
    motorFeature: number;
    /** Sample-weighted mean across every word in `wordModels`. Only
     *  consulted when the δ term is active. */
    word?: number;
  };
  weights?: ScoringWeights;
}): number {
  const w = args.word.toLowerCase();
  const weights = args.weights ?? DEFAULT_WEIGHTS;
  let bigSum = 0;
  let triSum = 0;
  const seenFeatures = new Set<string>();
  let featSum = 0;

  for (let i = 1; i < w.length; i++) {
    const a = w[i - 1]!;
    const b = w[i]!;
    const bg = a + b;
    const bgState = args.bigramModels.get(bg);
    // Explore-or-exploit: bigrams without enough samples to score
    // (state missing entirely, or state below MIN_SAMPLES_FOR_WEAKNESS)
    // get an exploration bonus so the algorithm prefers seeing them.
    // Once they cross the confidence threshold, real weakness scoring
    // kicks in (and the bonus stops applying).
    const isUnsampled =
      !bgState || bgState.n < MIN_SAMPLES_FOR_WEAKNESS;
    if (isUnsampled) {
      bigSum += UNTESTED_BIGRAM_BONUS;
    } else {
      // Per-category baseline: same-finger pairs (e.g. "lo" on QWERTY)
      // compare against the same-finger mean, not the global one. A
      // 200ms "lo" is unremarkable for that motion class even though
      // it'd be flagged as weak under a single global baseline.
      const cat = bigramCategory(a, b, args.layout);
      const cb = baselineForCategory(cat, args.baselines.bigram);
      bigSum += weakness(bgState, cb);
    }

    for (const fk of deriveFeatureKeys(a, b, args.layout)) {
      if (seenFeatures.has(fk)) continue;
      seenFeatures.add(fk);
      const fst = args.motorFeatureModels.get(fk);
      if (fst) featSum += weakness(fst, args.baselines.motorFeature);
    }
  }

  for (let i = 2; i < w.length; i++) {
    const tg = w[i - 2]! + w[i - 1]! + w[i]!;
    const st = args.trigramModels.get(tg);
    if (st) triSum += weakness(st, args.baselines.trigram);
  }

  // Word-level term — only contributes when a model and baseline are
  // available. Faster-than-baseline words score 0 (the weakness
  // helper already enforces this).
  let wordWeakness = 0;
  if (args.wordModels && args.baselines.word !== undefined) {
    const ws = args.wordModels.get(w);
    if (ws) wordWeakness = weakness(ws, args.baselines.word);
  }

  return (
    weights.alpha * bigSum +
    weights.beta * triSum +
    weights.gamma * featSum +
    weights.delta * wordWeakness
  );
}

/** Recency penalty multiplier. A word seen `testsAgo` tests back
 *  scales its score down on a curve that recovers to 1.0 over the
 *  recovery window. testsAgo = 0 means "in the test we just ran". */
export const RECENCY_FLOOR = 0.2;
export const RECENCY_RECOVERY_TESTS = 5;

export function recencyMultiplier(testsAgo: number): number {
  if (testsAgo < 0) return 1;
  if (testsAgo >= RECENCY_RECOVERY_TESTS) return 1;
  const t = testsAgo / RECENCY_RECOVERY_TESTS;
  return RECENCY_FLOOR + (1 - RECENCY_FLOOR) * t;
}

/** Challenge-band gate. Words whose predicted typing time falls in
 *  [user_baseline × low, user_baseline × high] are the productive
 *  zone — slightly slower than the user's average bigram time, not
 *  so slow that they stall. Past the high end they're frustrating;
 *  below the low end they're already easy. */
export const CHALLENGE_LOW = 1.05;
export const CHALLENGE_HIGH = 1.6;

export function inChallengeBand(
  predictedMs: number,
  userBaselineMsPerBigram: number,
  bigramCount: number,
): boolean {
  if (bigramCount === 0 || userBaselineMsPerBigram === 0) return true;
  const expected = userBaselineMsPerBigram * bigramCount;
  if (expected === 0) return true;
  const ratio = predictedMs / expected;
  return ratio >= CHALLENGE_LOW && ratio <= CHALLENGE_HIGH;
}

/** Weighted random sampling without replacement. Used to pick
 *  `count` words from the candidate pool, biased by score. Falls
 *  back to a clean shuffle when every score is zero (cold start). */
export function sampleWeighted(
  candidates: readonly { word: string; weight: number }[],
  count: number,
  rng: () => number = Math.random,
): string[] {
  if (candidates.length === 0) return [];
  const pool = candidates.map((c) => ({ ...c }));
  const out: string[] = [];
  const target = Math.min(count, pool.length);
  for (let pick = 0; pick < target; pick++) {
    const total = pool.reduce((sum, c) => sum + Math.max(0, c.weight), 0);
    if (total === 0) {
      // Every remaining candidate has zero weight — uniform random.
      const idx = Math.floor(rng() * pool.length);
      out.push(pool[idx]!.word);
      pool.splice(idx, 1);
      continue;
    }
    let r = rng() * total;
    let chosen = 0;
    for (let i = 0; i < pool.length; i++) {
      r -= Math.max(0, pool[i]!.weight);
      if (r <= 0) {
        chosen = i;
        break;
      }
    }
    out.push(pool[chosen]!.word);
    pool.splice(chosen, 1);
  }
  return out;
}
