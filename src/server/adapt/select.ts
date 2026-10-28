import type { HandLayoutPrefs } from "@/lib/hand-layout";
import type { TestRow } from "@/types/adapt";
import { bigramCategory, deriveFeatureKeys } from "./motor-features";
import {
  CHALLENGE_LOW,
  inChallengeBand,
  pacingFrom,
  type Pacing,
} from "./pacing";
import { recencyMultiplier } from "./recency";
import { pickWithCoverage } from "./sampling";
import {
  baselineForCategory,
  baselineMean,
  type BigramBaselines,
  bigramBaselines,
  bigramTerm,
  predictedWordMs,
  scoreWord,
  weakness,
  type ModelMap,
  type ScoringWeights,
} from "./scoring";
import { initialOverlaps, patternDose } from "./spacing";

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
  /** Newest-first list of recent test rows. Drives difficulty pacing
   *  (fatigue, accuracy strain, form — see `pacing.ts`). */
  recentTests: readonly TestRow[];
  /** Map from word to the test-distance back at which it was last
   *  shown. 0 = the test we just ran; 1 = the test before that. Drives
   *  word recency and pattern spacing (`spacing.ts`). */
  recentlyShown: ReadonlyMap<string, number>;
  weights?: ScoringWeights;
  rng?: () => number;
  /** Request time. Enables staleness (old estimates are trusted less
   *  and drift back toward exploration) and session-aware pacing.
   *  Omitted → time-independent selection. */
  nowMs?: number;
};

export type SelectionResult = {
  words: string[];
  cold: boolean;
};

export type BatchSelectionResult = {
  batches: string[][];
  cold: boolean;
  pacing: Pacing;
};

type Candidate = {
  word: string;
  /** Weakness score after the pacing concentration exponent. */
  concentrated: number;
  patterns: string[];
  predictedMs: number;
  bigramCount: number;
};

export function selectWords(input: SelectionInput): SelectionResult {
  const r = selectBatches(input, 1);
  return { words: r.batches[0] ?? [], cold: r.cold };
}

/** Score the pool once and draw `batchCount` passages from it. Each
 *  later batch treats the earlier batches' words as just shown, so a
 *  user who restarts without finishing gets fresh words rather than a
 *  reshuffle of the passage they skipped. */
export function selectBatches(
  input: SelectionInput,
  batchCount: number,
): BatchSelectionResult {
  const cold = sumSamples(input.bigramModels) < COLD_BIGRAM_THRESHOLD;
  const now = input.nowMs;
  const pacing = pacingFrom(input.recentTests, now);

  const baselines = {
    bigram: bigramBaselines(input.bigramModels, input.layout),
    trigram: baselineMean(input.trigramModels),
    motorFeature: baselineMean(input.motorFeatureModels),
    word: input.wordModels ? baselineMean(input.wordModels) : 0,
  };

  const candidates: Candidate[] = input.pool.map((word) => {
    const raw = scoreWord({
      word,
      bigramModels: input.bigramModels,
      trigramModels: input.trigramModels,
      motorFeatureModels: input.motorFeatureModels,
      wordModels: input.wordModels,
      layout: input.layout,
      baselines,
      weights: input.weights,
      nowMs: now,
    });
    return {
      word,
      // Sharpen the weakness signal so the weighted pick concentrates
      // on the user's actual worst words rather than spreading flatly
      // across every middling candidate. Pacing softens this when the
      // user is struggling and sharpens it when they're in form.
      // Recency stays a *linear* multiplier (applied per batch below).
      concentrated: raw > 0 ? raw ** pacing.concentration : 0,
      patterns: weakPatternKeys(word, input, baselines.bigram, baselines.motorFeature),
      predictedMs: predictedWordMs(
        word,
        input.bigramModels,
        baselines.bigram,
        input.layout,
      ),
      bigramCount: Math.max(0, word.length - 1),
    };
  });

  const pool = cold
    ? candidates
    : bandedPool(candidates, baselines.bigram.overall, input.count, pacing);

  // Pattern spacing: patterns recent tests already drilled start the
  // coverage pick partially covered, so this passage rotates to other
  // weaknesses for a test or two (see spacing.ts).
  const overlaps = initialOverlaps(
    patternDose(input.recentlyShown, input.layout),
    pool.map((c) => c.patterns),
  );

  const recency = new Map(input.recentlyShown);
  const batches: string[][] = [];
  for (let b = 0; b < Math.max(1, batchCount); b++) {
    const items = pool.map((c) => ({
      word: c.word,
      weight: c.concentrated * recencyMultiplier(recency.get(c.word) ?? Infinity),
      patterns: c.patterns,
    }));
    const words = pickWithCoverage(items, input.count, input.rng, overlaps);
    batches.push(words);
    for (const w of words) recency.set(w, 0);
  }

  return { batches, cold, pacing };
}

/** Apply the challenge band with progressive relaxation. The band is a
 *  coarse "is this word in the right ballpark" filter on the overall
 *  baseline. When the strict band can't fill a passage, it relaxes the
 *  *easy* end first — easy words carry ~0 weight, so they only pad the
 *  gaps — and drops the ceiling only as a last resort. Dropping the
 *  whole band at once (the old behaviour) let the most pathological
 *  words, which carry the highest weights, flood a short pool. Never
 *  returns fewer candidates than the full pool can supply. */
function bandedPool(
  candidates: readonly Candidate[],
  baselineMs: number,
  count: number,
  pacing: Pacing,
): readonly Candidate[] {
  const tiers: Array<[number, number]> = [
    [CHALLENGE_LOW, pacing.challengeHigh],
    [0, pacing.challengeHigh],
  ];
  for (const [low, high] of tiers) {
    const banded = candidates.filter((c) =>
      inChallengeBand(c.predictedMs, baselineMs, c.bigramCount, high, low),
    );
    if (banded.length >= count) return banded;
  }
  return candidates;
}

/** The weak / still-exploring patterns a word touches, used by the
 *  coverage pick. A bigram counts (`b:`) while it earns exploration
 *  bonus or scores positive weakness; a motor feature (`f:`) when it
 *  scores positive weakness. Spreading across these keys is what turns
 *  "20 copies of the weakest word" into "the top weak motions, each
 *  covered". */
function weakPatternKeys(
  word: string,
  input: SelectionInput,
  bigramBs: BigramBaselines,
  motorFeatureBaseline: number,
): string[] {
  const w = word.toLowerCase();
  const keys = new Set<string>();
  for (let i = 1; i < w.length; i++) {
    const a = w[i - 1]!;
    const b = w[i]!;
    const bg = a + b;
    const cb = baselineForCategory(bigramCategory(a, b, input.layout), bigramBs);
    const term = bigramTerm(input.bigramModels.get(bg), cb, input.nowMs);
    if (term.weakness > 0 || term.explore > 0) keys.add(`b:${bg}`);
    for (const fk of deriveFeatureKeys(a, b, input.layout)) {
      const fst = input.motorFeatureModels.get(fk);
      if (fst && weakness(fst, motorFeatureBaseline, input.nowMs) > 0) {
        keys.add(`f:${fk}`);
      }
    }
  }
  return [...keys];
}

function sumSamples(models: ModelMap): number {
  let total = 0;
  for (const st of models.values()) total += st.n;
  return total;
}
