import { z } from "zod";
import type { FingerId } from "@/lib/hand-layout";
import type { TestMode, TestRow } from "./adapt";
import type { FrictionKey, SliceSet, TestDigestV1 } from "./typing-analysis";

/** Contract of the `insights` namespace (overview, usual, clear) and the
 *  pooled typing-analysis models behind it (src/lib/typing-analysis/pooled/). */

/** The projection of a `tests` row the analysis reads (db.testSummaries).
 *  Declared here, in P2a, so the engine and the pooled models compile
 *  before the storage commit (P3a) exists. */
export type TestSummaryRow = Pick<TestRow,
  "id" | "startedAt" | "mode" | "lengthMode" | "durationOrWordCount" | "wpm" | "accuracy" | "errorCount" | "wasCompleted">;

/** A runBucketKey() string (src/lib/test-bucket.ts): mode|lengthMode|length,
 *  plus "|t" for touch runs. */
export const bucketKeySchema = z.string().max(80)
  .regex(/^(casual|training|race|reverse_adaptive)\|(words|time|quote)\|(0|[1-9]\d{0,4})(\|t)?$/);

export const insightsOverviewInputSchema = z.object({ bucket: bucketKeySchema.optional() });
export type InsightsOverviewInput = z.infer<typeof insightsOverviewInputSchema>;

export const insightsUsualInputSchema = z.object({
  bucket: bucketKeySchema,
  beforeMs: z.number().int().nonnegative(),
  fixMode: z.enum(["fix", "block", "none"]),
});
export type InsightsUsualInput = z.infer<typeof insightsUsualInputSchema>;

export type InsightsBucket = {
  key: string; mode: TestMode; lengthMode: "words" | "time" | "quote"; length: number; touch: boolean;
  tests: number; analysed: number; lastAtMs: number;
};
export type GateUnit = "tests" | "sessions" | "days" | "fixes" | "gaps" | "keys";
export type Gate = { have: number; need: number; unit: GateUnit };
export type RangeSummary = { low: number; mid: number; high: number; n: number; rule: "middle-80" | "min-max" };

export type TrendState = "improving" | "steady" | "slipping" | "levelled" | "early";
export type SpeedHeadline = {
  usual: number;               // median of the usual window (adjusted when `adjusted`)
  range: RangeSummary | null;  // null below 5 tests
  last: number;                // newest test (adjusted when `adjusted`)
  adjusted: boolean;
  trend: {
    state: TrendState;
    deltaWpm: number | null;   // improving / slipping only
    earlierN: number;
    sinceMs: number | null;
    weeks: number | null;      // levelled only
    explanation: FrictionKey | null;
    gate: Gate | null;         // early only
  };
};

export type BarrierKind = FrictionKey;
export type BarrierVariant = "frequency" | "cost" | "longWords" | "flat" | "pair";
export type PracticeAction = { kind: "drill"; drillId: string } | { kind: "test" };
export type Range = { low: number; high: number };
export type BarrierDetail = {
  perMin?: [recent: number, earlier: number];     // mistakes a minute: recent vs the tests before (rate test, spec-10 §13.6)
  costKeys?: [recent: number, usual: number];     // keys' worth of time per mistake: recent vs usual
  pauseOneIn?: [recent: number, better: number];  // share of words paused before: recent vs Kelley-shrunk better days
  pair?: string;
};

export type TimeSection =
  | { status: "ready"; recent: SliceSet; better: SliceSet;   // seconds per minute, 1 dp, each Σ = 60.0
      tests: number; flowWpm: number | null; whatIf: Range | null;
      keysPerSecond: number | null;   // flowWpm·5/60: the flow speed in keys, never the Q40 pace
      catchFactor: number;            // how many times your pace a hesitation took lately (1.6–3.0, 1 dp)
      breakMs: number; focus: BarrierKind | null; coarse: boolean;
      fixMode: "fix" | "block" | "none" }  // the fixKey; "none" changes the Fixing clause (spec-40 §3.2)
  | { status: "learning"; last: SliceSet | null; gate: Gate }
  | { status: "not-ready" };

export type Barrier = {
  kind: BarrierKind; variant: BarrierVariant;
  recent: number; better: number;            // s/min
  recoverable: Range;                        // s/min
  gain: Range;                               // wpm
  detail: BarrierDetail;
  action: PracticeAction | null;             // never a locked drill
};
export type BarriersSection =
  | { status: "ready"; items: Barrier[] }    // 0..3
  | { status: "learning"; gate: Gate }
  | { status: "not-ready" };

export type ChangeKind = "speed" | "accuracy" | "fixing" | "before" | "inside" | "flow" | "pair";
export type Change = {
  kind: ChangeKind; key?: string;            // key: the pair, for kind "pair"
  direction: "better" | "worse";
  before: number; after: number;
  unit: "wpm" | "points" | "sPerMin" | "ms";
};
export type ChangesSection =
  | { status: "ready"; items: Change[]; earlierN: number }   // 0..3
  | { status: "learning"; gate: Gate }
  | { status: "not-ready" };

export type TrendSeries = {
  points: { t: number; wpm: number; value: number; acc: number; pb: boolean }[];
  median: { t: number; v: number }[];
  band: { t: number; lo: number; hi: number }[];
  adjusted: boolean;
};

export type HabitKind = "mistakeCost" | "longWords" | "paceToEnd" | "warmUp" | "fatigue" | "hands";
export type Habit =
  /** A description, not a judgement: no band (spec-10 §13.9). */
  | { kind: "mistakeCost"; costMs: number; costKeys: number; noticeKeys: number | null; n: number }
  | { kind: "longWords"; answer: "yes-quite" | "a-little" | "not-really"; longRate: number; shortRate: number; n: number }
  | { kind: "paceToEnd"; answer: "yes" | "fade-a-little" | "speed-up"; slower: number; of: number; n: number }
  | { kind: "warmUp"; answer: "usually" | "not-really"; wpm: number | null; n: number }
  | { kind: "fatigue"; answer: "after-20" | "not-that-we-can-see"; accuracyDrop: number | null; n: number }
  | { kind: "hands"; answer: "even" | "left-slower" | "right-slower" | "unsupported"; ms: number | null;
      slowest: { finger: FingerId; keys: string[]; ms: number } | null; n: number };
export type HabitsSection = { items: Habit[]; pending: { kind: HabitKind; gate: Gate }[] };

export type PatternRow = { key: string; extraMs: number; meanMs: number; samples: number };
export type PracticeTargets = { pairs: PatternRow[]; words: PatternRow[]; weaknessReady: boolean; worstWordsReady: boolean };

export type NextStep =
  | { kind: "barrier"; barrier: BarrierKind; variant: BarrierVariant; detail: BarrierDetail;
      recent: number; better: number; gain: Range; action: PracticeAction; alternatives: PracticeAction[] }
  | { kind: "levelled" | "improving" | "steady" | "slipping" | "learning";
      action: PracticeAction; alternatives: PracticeAction[]; gate: Gate | null };

export type InsightsOverviewOutput = {
  status: "ready" | "not-ready" | "empty";   // not-ready: test_analyses missing; empty: no eligible tests
  buckets: InsightsBucket[];
  bucket: InsightsBucket | null;
  headline: SpeedHeadline | null;
  nextStep: NextStep;
  time: TimeSection;
  barriers: BarriersSection;
  changes: ChangesSection;
  series: TrendSeries | null;                 // null below 2 tests
  habits: HabitsSection | null;               // null when status is empty
  practice: PracticeTargets;
  progress: { tests: number; analysed: number; sessions: number; sessionsWithTwo: number; spanDays: number };
  cold: boolean;                              // for the playground
};

/** What the insights loader returns (spec-30 §6.2); declared here per R1. */
export type InsightsData = {
  rows: TestSummaryRow[];
  index: Map<string, { bucket: string; diff: number | null }>;   // = AnalysisIndex (spec-10 §12)
  digests: Map<string, TestDigestV1> | "unavailable";             // parsed with parseDigest; failures dropped
  chosenBucket: string | null;
};

export type InsightsUsualOutput = {
  status: "ready" | "learning" | "not-ready";
  reference: { kind: "usual" | "earlier-today"; n: number } | null;
  speed: RangeSummary | null;                 // raw wpm, never adjusted
  accuracy: RangeSummary | null;
  slices: Record<FrictionKey, number> | null; // median s/min of the reference digests (fixing: same fix mode)
  gate: Gate | null;                          // learning only
};

export type ClearAnalysesOutput = { deleted: number };
