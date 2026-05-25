import type { HandLayoutPrefs } from "@/lib/hand-layout";
import type { TestRow } from "@/types/adapt";
import { bigramCategory, deriveFeatureKeys } from "./motor-features";
import {
  baselineForCategory,
  baselineMean,
  type BigramBaselines,
  bigramBaselines,
  COVERAGE_DECAY,
  fatigueDampener,
  inChallengeBand,
  MIN_SAMPLES_FOR_WEAKNESS,
  predictedWordMs,
  recencyMultiplier,
  scoreWord,
  weakness,
  type ModelMap,
  type ScoringWeights,
} from "./scoring";

/** Total bigram samples below this and the user is still cold —
 *  the route should fall back to its own random word generation
 *  rather than serving a near-random adaptive selection. */
export const COLD_BIGRAM_THRESHOLD = 200;

export type SelectionInput = {
  count: number;
  pool: readonly string[];
  bigramModels: ModelMap;
  trigramModels: ModelMap;
  motorFeatureModels: ModelMap;
  /** Per-user, per-word running stats. Optional — when omitted the
   *  selector behaves exactly as it did before the word model
   *  shipped. When present, scoring reads the word-level weakness
   *  term and weights it via `δ`. */
  wordModels?: ModelMap;
  layout: HandLayoutPrefs;
  /** Newest-first list of recent test rows. Used for fatigue. */
  recentTests: readonly TestRow[];
  /** Map from word to the test-distance back at which it was last
   *  shown. 0 = the test we just ran; 1 = the test before that. */
  recentlyShown: ReadonlyMap<string, number>;
  weights?: ScoringWeights;
  rng?: () => number;
};

export type SelectionResult = {
  words: string[];
  cold: boolean;
};

export function selectWords(input: SelectionInput): SelectionResult {
  const totalBigramSamples = sumSamples(input.bigramModels);
  const cold = totalBigramSamples < COLD_BIGRAM_THRESHOLD;

  const baselines = {
    bigram: bigramBaselines(input.bigramModels, input.layout),
    trigram: baselineMean(input.trigramModels),
    motorFeature: baselineMean(input.motorFeatureModels),
    word: input.wordModels ? baselineMean(input.wordModels) : 0,
  };

  const fatigue = fatigueDampener(input.recentTests);

  const candidates = input.pool.map((word) => {
    const raw = scoreWord({
      word,
      bigramModels: input.bigramModels,
      trigramModels: input.trigramModels,
      motorFeatureModels: input.motorFeatureModels,
      wordModels: input.wordModels,
      layout: input.layout,
      baselines,
      weights: input.weights,
    });
    const recency = recencyMultiplier(input.recentlyShown.get(word) ?? Infinity);
    const predicted = predictedWordMs(
      word,
      input.bigramModels,
      baselines.bigram,
      input.layout,
    );
    return {
      word,
      weight: Math.max(0, raw * fatigue * recency),
      patterns: weakPatternKeys(
        word,
        input.bigramModels,
        input.motorFeatureModels,
        baselines.bigram,
        baselines.motorFeature,
        input.layout,
      ),
      predictedMs: predicted,
      bigramCount: Math.max(0, word.length - 1),
    };
  });

  // Apply the challenge band — but only after we have a baseline.
  // On cold start, we accept everything (the band would reject every
  // candidate when baseline is 0). When applying it would exclude the
  // entire pool, we fall back to "no band" so we never return [] —
  // an empty word list breaks the practice surface. The band still
  // uses the *overall* baseline because it's a coarse "is this word
  // in the right ballpark" filter, not a per-pair weakness check.
  let filtered = candidates;
  if (!cold) {
    const banded = candidates.filter((c) =>
      inChallengeBand(c.predictedMs, baselines.bigram.overall, c.bigramCount),
    );
    if (banded.length >= input.count) filtered = banded;
  }

  // Greedy coverage pick: weighted-random without replacement, but
  // each pick down-weights candidates whose weak patterns are already
  // represented in the passage so far (COVERAGE_DECAY). This spreads a
  // passage across the user's top weak motions instead of stacking
  // carriers of the single weakest pair. On cold start every weight is
  // an exploration bonus and coverage spreads across distinct unsampled
  // bigrams; if a sub-pool is genuinely all-zero, the pick falls
  // through to uniform random.
  const words = selectWithCoverage(filtered, input.count, input.rng);

  return { words, cold };
}

/** The weak / explore patterns a word touches, used by the coverage
 *  pick. A bigram that's still unsampled is an exploration target
 *  (`u:`); a sampled bigram or motor-feature counts only when it
 *  scores positive weakness (`b:` / `f:`). Spreading across these keys
 *  is what turns "20 copies of the weakest word" into "the top weak
 *  motions, each covered". */
function weakPatternKeys(
  word: string,
  bigramModels: ModelMap,
  motorFeatureModels: ModelMap,
  bigramBs: BigramBaselines,
  motorFeatureBaseline: number,
  layout: HandLayoutPrefs,
): string[] {
  const w = word.toLowerCase();
  const keys = new Set<string>();
  for (let i = 1; i < w.length; i++) {
    const a = w[i - 1]!;
    const b = w[i]!;
    const bg = a + b;
    const st = bigramModels.get(bg);
    if (!st || st.n < MIN_SAMPLES_FOR_WEAKNESS) {
      keys.add(`u:${bg}`);
    } else {
      const cb = baselineForCategory(bigramCategory(a, b, layout), bigramBs);
      if (weakness(st, cb) > 0) keys.add(`b:${bg}`);
    }
    for (const fk of deriveFeatureKeys(a, b, layout)) {
      const fst = motorFeatureModels.get(fk);
      if (fst && weakness(fst, motorFeatureBaseline) > 0) keys.add(`f:${fk}`);
    }
  }
  return [...keys];
}

/** Weighted random sampling without replacement, biased by `weight`
 *  and damped by pattern overlap with already-picked words. */
function selectWithCoverage(
  items: readonly { word: string; weight: number; patterns: readonly string[] }[],
  count: number,
  rng: () => number = Math.random,
): string[] {
  if (items.length === 0) return [];
  const pool = items.map((i) => ({ ...i }));
  const covered = new Set<string>();
  const out: string[] = [];
  const target = Math.min(count, pool.length);
  for (let pick = 0; pick < target; pick++) {
    const weights = pool.map((p) => {
      let overlap = 0;
      for (const pat of p.patterns) if (covered.has(pat)) overlap++;
      return Math.max(0, p.weight) * COVERAGE_DECAY ** overlap;
    });
    const idx = weightedPickIndex(weights, rng);
    const chosen = pool[idx]!;
    out.push(chosen.word);
    for (const pat of chosen.patterns) covered.add(pat);
    pool.splice(idx, 1);
  }
  return out;
}

/** Pick one index from a weight array, biased by weight. Falls back to
 *  uniform random when every weight is zero (cold sub-pool). */
function weightedPickIndex(
  weights: readonly number[],
  rng: () => number,
): number {
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (total === 0) return Math.floor(rng() * weights.length);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= Math.max(0, weights[i]!);
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/** Step the recently-shown map forward by one test: every existing
 *  entry's distance increases by 1, words from the just-served test
 *  are stamped at distance 0. Old entries past the recovery window
 *  are dropped to keep the map bounded. */
export function advanceRecency(
  prev: ReadonlyMap<string, number>,
  newWords: readonly string[],
  recoveryWindow: number,
): Map<string, number> {
  const next = new Map<string, number>();
  for (const [word, dist] of prev) {
    const aged = dist + 1;
    if (aged < recoveryWindow) next.set(word, aged);
  }
  for (const word of newWords) next.set(word, 0);
  return next;
}

function sumSamples(models: ModelMap): number {
  let total = 0;
  for (const st of models.values()) total += st.n;
  return total;
}
