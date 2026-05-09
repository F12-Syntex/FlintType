import type { HandLayoutPrefs } from "@/lib/hand-layout";
import type { TestRow } from "@/types/adapt";
import {
  baselineMean,
  bigramBaselines,
  fatigueDampener,
  inChallengeBand,
  predictedWordMs,
  recencyMultiplier,
  sampleWeighted,
  scoreWord,
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
      score: raw * fatigue * recency,
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

  // Cold start: every candidate has score 0; sampleWeighted falls
  // through to uniform. That's intentional — we surface random words
  // until measurements accumulate.
  const words = sampleWeighted(
    filtered.map((c) => ({ word: c.word, weight: Math.max(0, c.score) })),
    input.count,
    input.rng,
  );

  return { words, cold };
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
