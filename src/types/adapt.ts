import { z } from "zod";
import type { HandLayoutPrefs } from "@/lib/hand-layout";

export type {
  BigramModelRow,
  NewBigramModelRow,
  TrigramModelRow,
  NewTrigramModelRow,
  MotorFeatureModelRow,
  NewMotorFeatureModelRow,
} from "@/db/schema/server/adapt-models";

export type {
  WordModelRow,
  NewWordModelRow,
} from "@/db/schema/server/word-models";

export type { TestRow, NewTestRow } from "@/db/schema/server/tests";

/** Shape of a single Welford-state delta written back after a test.
 *  Same field set across bigram / trigram / motor-feature models —
 *  only the keying column differs (bigram, trigram, featureKey). */
export type ModelDelta = {
  meanMs: number;
  varianceMs: number;
  sampleCount: number;
};

/** One keystroke timing as transmitted from the client when a test
 *  ends. `t` is ms since the test started; `expected` is the target
 *  char (empty string when the cursor is past word end); `typed` is
 *  what the user pressed. The algorithm filters this stream before
 *  feeding it into the models. */
export const keystrokeTimingSchema = z.object({
  t: z.number().nonnegative(),
  expected: z.string(),
  typed: z.string(),
  correct: z.boolean(),
  /** Word index (within the test passage) of the keystroke. Used by
   *  the filter to detect "first keystroke after a backspace" — that
   *  measurement is contaminated and gets discarded. */
  wordIndex: z.number().int().nonnegative(),
});
export type KeystrokeTiming = z.infer<typeof keystrokeTimingSchema>;

/** Test mode the algorithm cares about. The history surface may
 *  expose other display modes; this is the algorithmic axis. */
export const testModeSchema = z.enum([
  "casual",
  "training",
  "reverse_adaptive",
]);
export type TestMode = z.infer<typeof testModeSchema>;

export const submitTestInputSchema = z.object({
  startedAt: z.number().int().nonnegative(),
  completedAt: z.number().int().nonnegative(),
  mode: testModeSchema,
  durationOrWordCount: z.number().int().nonnegative(),
  wpm: z.number().nonnegative(),
  accuracy: z.number().min(0).max(100),
  errorCount: z.number().int().nonnegative(),
  resetCount: z.number().int().nonnegative(),
  wasCompleted: z.boolean(),
  words: z.array(z.string()).max(2000),
  timings: z.array(keystrokeTimingSchema).max(20000),
});
export type SubmitTestInput = z.infer<typeof submitTestInputSchema>;

export type SubmitTestOutput = {
  testId: string;
  measurementsAccepted: number;
  measurementsRejected: number;
};

export const requestWordsInputSchema = z.object({
  count: z.number().int().min(1).max(2000),
  /** Pool to draw from — the algorithm scores each candidate against
   *  the user's models. The shipping pool is the top ~200 monkeytype
   *  english words; passing it explicitly keeps the route stateless. */
  pool: z.array(z.string()).min(1).max(50000),
  /** How many independent batches of `count` words to generate in one
   *  call. The first batch is the active passage; the rest fill a
   *  client-side prefetch queue so the next few resets don't pause
   *  for a network round-trip. Max 10 keeps per-call work bounded;
   *  default 1 preserves the old single-batch contract. */
  batches: z.number().int().min(1).max(10).optional(),
});
export type RequestWordsInput = z.infer<typeof requestWordsInputSchema>;

export type RequestWordsOutput = {
  /** One batch of `count` words per slot. `batches[0]` is what the
   *  caller renders now; the rest are pre-generated against the same
   *  model snapshot for the prefetch queue. Always at least one
   *  entry on success. */
  batches: string[][];
  /** Truthy when the user has not yet built up enough measurements for
   *  the algorithm to bias selection — caller falls back to its own
   *  random draw. */
  cold: boolean;
};

// ─── Algorithm visualisation (the /app/biogram page) ─────────────────

export type AdaptModelRow = {
  key: string;
  meanMs: number;
  varianceMs: number;
  sampleCount: number;
  /** Computed at snapshot time — saves the client from repeating the
   *  baseline math against every row. */
  weakness: number;
};

export type AdaptTestSummary = {
  id: string;
  startedAtMs: number;
  mode: string;
  wpm: number;
  accuracy: number;
  errorCount: number;
  wasCompleted: boolean;
};

export type AdaptSnapshotOutput = {
  baselines: {
    bigram: number;
    trigram: number;
    motorFeature: number;
  };
  totalBigramSamples: number;
  cold: boolean;
  fatigueDampener: number;
  bigrams: AdaptModelRow[];
  trigrams: AdaptModelRow[];
  motorFeatures: AdaptModelRow[];
  recentTests: AdaptTestSummary[];
  recentlyShown: { word: string; testsAgo: number }[];
  handLayout: HandLayoutPrefs;
  fingerMapHash: string;
};

export const scoreWordInputSchema = z.object({
  word: z.string().min(1).max(100),
});
export type ScoreWordInput = z.infer<typeof scoreWordInputSchema>;

export type WeaknessBreakdown = {
  key: string;
  weakness: number;
  meanMs: number | null;
  sampleCount: number;
};

export type ScoreWordOutput = {
  word: string;
  total: number;
  alphaContribution: number;
  betaContribution: number;
  gammaContribution: number;
  predictedMs: number;
  recencyMultiplier: number;
  inChallengeBand: boolean;
  bigrams: WeaknessBreakdown[];
  trigrams: WeaknessBreakdown[];
  motorFeatures: WeaknessBreakdown[];
};
