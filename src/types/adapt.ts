import { z } from "zod";
import type { HandLayoutPrefs } from "@/lib/hand-layout";
import { MAX_PLAUSIBLE_WPM } from "@/lib/wpm-limits";

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
  // Bound at 8 chars so a malformed payload can't blow up the
  // 20,000-timing array into a multi-megabyte memory hit. 8 is wider
  // than any real keystroke (a single grapheme is at most a handful
  // of code units, even for compound emoji) and still keeps the
  // worst-case payload under a few hundred KB.
  expected: z.string().max(8),
  typed: z.string().max(8),
  correct: z.boolean(),
  /** Word index (within the test passage) of the keystroke. Used by
   *  the filter to detect "first keystroke after a backspace" — that
   *  measurement is contaminated and gets discarded. */
  wordIndex: z.number().int().nonnegative(),
});
export type KeystrokeTiming = z.infer<typeof keystrokeTimingSchema>;

/** Test mode the algorithm cares about. The history surface may
 *  expose other display modes; this is the algorithmic axis.
 *  `race` is multiplayer-race output — the typing data feeds the
 *  same bigram/trigram/word models as a casual run, but the row
 *  is tagged separately so history and PB queries can filter it. */
export const testModeSchema = z.enum([
  "casual",
  "training",
  "reverse_adaptive",
  "race",
]);
export type TestMode = z.infer<typeof testModeSchema>;

/** One per-second WPM sample from the live chart, posted alongside
 *  the test summary so the server can persist it for later rendering
 *  on the share card. Bounded at 600 samples (10min of 1-sec ticks)
 *  so payloads stay small even for absurd-length runs. */
export const wpmSampleSchema = z.object({
  t: z.number().nonnegative(),
  // Per-second instantaneous samples can spike above the run average
  // (first-second jitter), so they get double the hard cap — they're
  // display-only chart data, never leaderboard input.
  wpm: z.number().min(0).max(MAX_PLAUSIBLE_WPM * 2),
  raw: z.number().min(0).max(MAX_PLAUSIBLE_WPM * 2),
});
export type WpmSamplePayload = z.infer<typeof wpmSampleSchema>;

export const submitTestInputSchema = z.object({
  startedAt: z.number().int().nonnegative(),
  completedAt: z.number().int().nonnegative(),
  mode: testModeSchema,
  // 10k covers the longest sane bucket (600s time mode, 2000-word
  // passages) with headroom; an unbounded int was forgeable noise.
  durationOrWordCount: z.number().int().nonnegative().max(10_000),
  /** Length unit for `durationOrWordCount` — the words-vs-time-vs-quote
   *  discriminator the share label branches on. Optional so older
   *  clients (and the race/drill submit paths) still validate; persisted
   *  as null when absent (legacy rows drop the share unit prefix). */
  lengthMode: z.enum(["words", "time", "quote"]).optional(),
  // Hard ceiling mirrors the race authority's gross-WPM cap — claims
  // above MAX_PLAUSIBLE_WPM are rejected at the wire. The submit
  // handler additionally cross-checks the claim against the run's
  // verifiable payload (issue #38).
  wpm: z.number().nonnegative().max(MAX_PLAUSIBLE_WPM),
  accuracy: z.number().min(0).max(100),
  // Errors are bounded by the keystroke cap (20k timings) plus
  // generous slack for clients that don't ship timings.
  errorCount: z.number().int().nonnegative().max(100_000),
  resetCount: z.number().int().nonnegative().max(10_000),
  wasCompleted: z.boolean(),
  // Per-word string cap mirrors the longest single token we'd ever
  // place in a passage (long English words top out around 30 chars;
  // 64 covers any reasonable URL/identifier the algorithm might
  // emit and stops a malformed payload from inflating the array).
  words: z.array(z.string().max(64)).max(2000),
  timings: z.array(keystrokeTimingSchema).max(20000),
  // Roll-up stats and per-second chart — all optional so older
  // clients (and the race/drill submit paths that haven't been
  // updated) still validate. Server persists them as-is for the
  // share-card renderer.
  rawWpm: z.number().nonnegative().max(MAX_PLAUSIBLE_WPM).optional(),
  // Peak is a per-second instantaneous figure — same 2× display-only
  // headroom as wpmHistory samples.
  peakWpm: z.number().nonnegative().max(MAX_PLAUSIBLE_WPM * 2).optional(),
  avgWpm: z.number().nonnegative().max(MAX_PLAUSIBLE_WPM).optional(),
  stallWpm: z.number().nonnegative().max(MAX_PLAUSIBLE_WPM).optional(),
  consistency: z.number().min(0).max(100).optional(),
  wpmHistory: z.array(wpmSampleSchema).max(600).optional(),
});
export type SubmitTestInput = z.infer<typeof submitTestInputSchema>;

export type SubmitTestOutput = {
  testId: string;
  measurementsAccepted: number;
  measurementsRejected: number;
  /** True when this completed run beat the user's prior best WPM for
   *  the same (mode, length) bucket — the authoritative answer the
   *  results screen uses to decide whether to show the PB crown. Same
   *  determination that fires the personal-best notification, so the
   *  crown and the notification never disagree. False for ineligible
   *  runs (incomplete, or cold-training). */
  isPersonalBest: boolean;
  /** The prior best WPM in this bucket, or null when this is the first
   *  completed run for it. */
  previousBest: number | null;
};

export const requestWordsInputSchema = z.object({
  count: z.number().int().min(1).max(2000),
  /** Pool to draw from — the algorithm scores each candidate against
   *  the user's models. The shipping pool is the top ~200 monkeytype
   *  english words; passing it explicitly keeps the route stateless.
   *  Per-string cap stops a malformed pool of giant strings from
   *  pushing the array's serialised size into MB territory. */
  pool: z.array(z.string().max(64)).min(1).max(50000),
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

// ─── Algorithm visualisation (the /biogram page) ─────────────────

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
  /** Word-level (δ) contribution — the algorithm's whole-word
   *  weakness term. Heavier than α/β/γ at default weighting because
   *  word data is the most authoritative signal we have for a word
   *  the user has actually typed enough times to score. Zero when
   *  the word has no measurements yet. */
  deltaContribution: number;
  predictedMs: number;
  recencyMultiplier: number;
  inChallengeBand: boolean;
  bigrams: WeaknessBreakdown[];
  trigrams: WeaknessBreakdown[];
  motorFeatures: WeaknessBreakdown[];
  /** The whole-word measurement that fed `deltaContribution`. Null
   *  when the user has never completed this word. Named `wordModel`
   *  so it doesn't collide with the top-level `word: string`. */
  wordModel: WeaknessBreakdown | null;
};
