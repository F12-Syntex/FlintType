import type { HandLayoutPrefs } from "@/lib/hand-layout";
import {
  type PatternSpreads,
  WEAKNESS_CONFIDENCE_Z,
  effectiveSamples,
  evidenceWeight,
  exploreWeight,
  standardError,
} from "./evidence";
import {
  type BigramCategory,
  bigramCategory,
  deriveFeatureKeys,
} from "./motor-features";
import type { ModelState } from "./welford";

/** Display threshold: lists of "your weakest pairs" (history, profile)
 *  hide patterns with fewer samples than this, so a single slow
 *  keystroke never headlines a panel. Scoring itself no longer has a
 *  hard cutoff — low-sample patterns enter smoothly through the
 *  shrinkage + exploration ramps in `evidence.ts`. */
export const MIN_SAMPLES_FOR_WEAKNESS = 3;

/** Full exploration bonus for a never-typed bigram (fading out over
 *  `EXPLORE_SAMPLES`). Without it, words full of unsampled pairs —
 *  the highest-information words to serve — would score 0. 80
 *  (ms-equivalent) matches a moderately weak warm bigram, so untested
 *  pairs compete with weak ones rather than outranking them. */
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

/** Default weighting. γ — the motor-feature term — is the heaviest
 *  (2.0) because it is the only term that *generalises*: a weak
 *  "same-finger ring jump" or "index row-jump" is shared by every
 *  letter pair built from that motion, so optimising for it trains a
 *  transferable skill rather than a single word. α/β (bigrams,
 *  trigrams) stay at 1 — concrete but pair-specific. δ — the per-word
 *  term — is pulled *down* to 0.5 so it acts as a minor tie-breaker:
 *  without this, a confident slow whole-word mean dominated the score
 *  and the selector converged on memorising the same ~15 carrier words
 *  (`develop`, `possible`, …) instead of the motions underneath them.
 *  `weakness()` still shrinks δ by the word's evidence weight, so the
 *  word term only contributes once we have data on the word. */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  alpha: 1,
  beta: 1,
  gamma: 2,
  delta: 0.5,
};

export type ModelMap = ReadonlyMap<string, ModelState>;

/** Sample-count-weighted mean across every state in the map: the
 *  user's overall baseline for a pattern type. */
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

/** weakness = max(0, mean − baseline − z·SE) × evidenceWeight(n_eff) —
 *  the part of the pattern's gap to the baseline we're confident about
 *  (one standard error off), after Bayesian shrinkage toward the
 *  baseline (see `evidence.ts`). Faster-than-baseline patterns score 0:
 *  we never train strengths. `mean` is an *effective* time — fumbled
 *  attempts fold in what the mistake cost (see `slips.ts`) — so a pair
 *  you mistype scores as weak even when its clean keystrokes are quick.
 *  `nowMs` enables staleness: a pattern unseen for weeks is trusted
 *  less. Omit it for display-only callers. `priorRelVar` is the pooled
 *  spread for this pattern type (`patternSpreads`); it gives low-sample
 *  patterns a realistic error bar, so one mistake can't make a normal
 *  pair look confidently weak. */
export function weakness(
  state: ModelState,
  baseline: number,
  nowMs?: number,
  priorRelVar?: number,
): number {
  const nEff = effectiveSamples(state, nowMs);
  const se = standardError(state, nEff, priorRelVar);
  const gap = state.mean - baseline - WEAKNESS_CONFIDENCE_Z * se;
  if (!(gap > 0)) return 0;
  return gap * evidenceWeight(nEff);
}

/** One bigram's contribution to a word score, split into its measured
 *  weakness and the exploration bonus it still earns. Shared by
 *  `scoreWord` and the `adapt.scoreWord` breakdown so the two can never
 *  disagree. `state` undefined = never typed. */
export function bigramTerm(
  state: ModelState | undefined,
  categoryBaseline: number,
  nowMs?: number,
  priorRelVar?: number,
): { weakness: number; explore: number } {
  if (!state) return { weakness: 0, explore: UNTESTED_BIGRAM_BONUS };
  return {
    weakness: weakness(state, categoryBaseline, nowMs, priorRelVar),
    explore: UNTESTED_BIGRAM_BONUS * exploreWeight(effectiveSamples(state, nowMs)),
  };
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
  /** Request time — enables staleness (see `evidence.ts`). Omit for
   *  a time-independent score. */
  nowMs?: number;
  /** Pooled spread per pattern type (`patternSpreads`). Omit to score
   *  on each pattern's raw variance. */
  spreads?: PatternSpreads;
}): number {
  const w = args.word.toLowerCase();
  const now = args.nowMs;
  const sp = args.spreads;
  const weights = args.weights ?? DEFAULT_WEIGHTS;
  let bigSum = 0;
  let triSum = 0;
  const seenFeatures = new Set<string>();
  let featSum = 0;

  for (let i = 1; i < w.length; i++) {
    const a = w[i - 1]!;
    const b = w[i]!;
    const bg = a + b;
    // Explore-and-exploit: an untyped bigram earns the full
    // exploration bonus; as samples arrive the bonus fades and the
    // (shrunk) measured weakness takes over — no cliff. Per-category
    // baseline: same-finger pairs (e.g. "lo" on QWERTY) compare against
    // the same-finger mean, not the global one — a 200ms "lo" is
    // unremarkable for that motion class.
    const cat = bigramCategory(a, b, args.layout);
    const cb = baselineForCategory(cat, args.baselines.bigram);
    const term = bigramTerm(args.bigramModels.get(bg), cb, now, sp?.bigram);
    bigSum += term.weakness + term.explore;

    for (const fk of deriveFeatureKeys(a, b, args.layout)) {
      if (seenFeatures.has(fk)) continue;
      seenFeatures.add(fk);
      const fst = args.motorFeatureModels.get(fk);
      if (fst) featSum += weakness(fst, args.baselines.motorFeature, now, sp?.motorFeature);
    }
  }

  for (let i = 2; i < w.length; i++) {
    const tg = w[i - 2]! + w[i - 1]! + w[i]!;
    const st = args.trigramModels.get(tg);
    if (st) triSum += weakness(st, args.baselines.trigram, now, sp?.trigram);
  }

  // Word-level term — only contributes when a model and baseline are
  // available. Faster-than-baseline words score 0 (the weakness
  // helper already enforces this).
  let wordWeakness = 0;
  if (args.wordModels && args.baselines.word !== undefined) {
    const ws = args.wordModels.get(w);
    if (ws) wordWeakness = weakness(ws, args.baselines.word, now, sp?.word);
  }

  return (
    weights.alpha * bigSum +
    weights.beta * triSum +
    weights.gamma * featSum +
    weights.delta * wordWeakness
  );
}
