import { SESSION_GAP_MS, splitSessions } from "@/lib/test-bucket";
import type { InsightsUsualInput, InsightsUsualOutput, TestSummaryRow } from "@/types/insights";
import { FRICTION_ORDER, type FrictionKey, type TestDigestV1 } from "@/types/typing-analysis";
import { median, round } from "../stats";
import { sPerMin } from "./minute";
import { usualRange } from "./usual";
import { dg, eligible, toPooled, type AnalysisIndex, type PooledTest } from "./windows";

/** The result screen's "compared with your usual" (spec-10 §13.11,
 *  spec-30 §6.3). The bucket is used as given, whether or not the
 *  picker would list it, so a learning gate counts real tests. Speed is
 *  raw wpm (the result screen shows raw speed), never adjusted. */

export const REFERENCE_MIN = 5;
export const REFERENCE_MAX = 30;

const EMPTY = { reference: null, speed: null, accuracy: null, slices: null, gate: null };

export type UsualReference = {
  kind: "usual" | "earlier-today";
  /** The reference tests, newest first. */
  ts: PooledTest[];
  /** Every reference test started before this, and the reference is the
   *  bucket's newest eligible tests before it, so its digests are the
   *  bucket's newest REFERENCE_MAX digests before it. */
  digestsBeforeMs: number;
};

/** This bucket's eligible tests that started before `beforeMs`, newest first. */
function bucketTests(pooled: readonly PooledTest[], bucket: string, beforeMs: number): PooledTest[] {
  return pooled.filter((t) => t.bucket === bucket && eligible(t) && t.startedAtMs < beforeMs);
}

/** Step 2 of spec-10 §13.11. The current session is the chain of tests
 *  ending within SESSION_GAP_MS of `beforeMs`; the reference is up to 30
 *  tests before it, else the session's own earlier tests. Without a
 *  reference, `have` is every earlier test of the bucket (spec-30 §6.3),
 *  capped at REFERENCE_MIN − 1. So need − have is the fewest further
 *  tests before one is compared, when the last of them starts more than
 *  30 minutes after the test before it. It drops by one with each test
 *  until it reaches 1, and never reads 0. */
export function usualReference(tests: readonly PooledTest[], beforeMs: number): { ref: UsualReference | null; have: number } {
  const inSession = tests.length > 0 && beforeMs - tests[0]!.startedAtMs <= SESSION_GAP_MS
    ? splitSessions(tests)[0]!
    : [];
  const before = tests.slice(inSession.length, inSession.length + REFERENCE_MAX);
  if (before.length >= REFERENCE_MIN) {
    const start = inSession.length > 0 ? inSession[inSession.length - 1]!.startedAtMs : beforeMs;
    return { ref: { kind: "usual", ts: before, digestsBeforeMs: start }, have: before.length };
  }
  if (inSession.length >= REFERENCE_MIN) {
    return { ref: { kind: "earlier-today", ts: inSession.slice(0, REFERENCE_MAX), digestsBeforeMs: beforeMs }, have: inSession.length };
  }
  return { ref: null, have: Math.min(REFERENCE_MIN - 1, before.length + inSession.length) };
}

/** The digest read `insights.usual` makes: the reference window's own
 *  digests (step 4), never the newest ones before `beforeMs`, which a long
 *  current session would use up. null when there is no reference. The
 *  window comes from rows and the index alone, the same rule
 *  `assembleUsual` applies once the digests are loaded. */
export function referenceDigestQuery(rows: readonly TestSummaryRow[], index: AnalysisIndex, bucket: string,
  beforeMs: number): { beforeMs: number; limit: number } | null {
  const { ref } = usualReference(bucketTests(toPooled(rows, index, new Map()), bucket, beforeMs), beforeMs);
  return ref ? { beforeMs: ref.digestsBeforeMs, limit: REFERENCE_MAX } : null;
}

function slicesOf(ref: readonly PooledTest[], input: InsightsUsualInput): Record<FrictionKey, number> | null {
  const withD = ref.filter((t) => t.digest !== null);
  if (withD.length < REFERENCE_MIN) return null;
  const out = {} as Record<FrictionKey, number>;
  for (const x of FRICTION_ORDER) {
    const ts = x === "fixing" ? withD.filter((t) => dg(t).ctx.fixMode === input.fixMode) : withD;
    if (ts.length < REFERENCE_MIN) return null;
    out[x] = round(median(ts.map((t) => sPerMin(dg(t), x))), 1);
  }
  return out;
}

export function assembleUsual(data: {
  rows: TestSummaryRow[]; index: AnalysisIndex; digests: Map<string, TestDigestV1> | "unavailable";
  input: InsightsUsualInput; nowMs: number;
}): InsightsUsualOutput {
  const { input } = data;
  const available = data.digests !== "unavailable";
  const pooled = toPooled(data.rows, data.index, available ? (data.digests as Map<string, TestDigestV1>) : new Map());
  const { ref, have } = usualReference(bucketTests(pooled, input.bucket, input.beforeMs), input.beforeMs);
  if (!ref) {
    if (!available) return { ...EMPTY, status: "not-ready" };
    return { ...EMPTY, status: "learning", gate: { have, need: REFERENCE_MIN, unit: "tests" } };
  }
  return {
    status: available ? "ready" : "not-ready",
    reference: { kind: ref.kind, n: ref.ts.length },
    speed: usualRange(ref.ts.map((t) => t.wpm)),
    accuracy: usualRange(ref.ts.map((t) => t.accuracy)),
    slices: available ? slicesOf(ref.ts, input) : null,
    gate: null,
  };
}
