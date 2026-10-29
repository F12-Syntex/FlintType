import { parseRunBucketKey, runBucketKey, splitSessions, toBucketSpec } from "@/lib/test-bucket";
import type { TestMode } from "@/types/adapt";
import type { InsightsBucket, TestSummaryRow } from "@/types/insights";
import type { FixMode, RunLengthMode, TestDigestV1 } from "@/types/typing-analysis";

/** Pooled windows over a user's tests (spec-10 §12). Every pooled model
 *  reads a bucket through `windowsFor`, so "recent", "earlier" and
 *  "usual" mean the same tests everywhere. Pure: callers pass `nowMs`. */

export type PooledTest = {
  id: string; startedAtMs: number; mode: TestMode; lengthMode: RunLengthMode | null;
  length: number; wpm: number; accuracy: number; wasCompleted: boolean;
  digest: TestDigestV1 | null; bucket: string;
  diff: number | null;         // from the analysis index, for every analysed test (not only loaded digests)
  session: number;             // splitSessions index, for the clustered noise model (§13.1)
  /** In the analysis index (a digest is stored), whether or not it was
   *  loaded: the picker's "analysed" count needs every bucket's figure. */
  indexed: boolean;
};

/** testId → { bucket, diff }, from db.testAnalyses.indexForUser (spec-30 §2.1). */
export type AnalysisIndex = Map<string, { bucket: string; diff: number | null }>;

export type Windows = {
  tests: PooledTest[]; recent: PooledTest[]; earlier: PooledTest[]; usual: PooledTest[];
  recentD: PooledTest[]; earlierD: PooledTest[]; usualD: PooledTest[]; sessionsInRecent: number;
};

export const RECENT_N = 10;
export const EARLIER_END = 40;
export const USUAL_N = 30;
/** "Active lately": the default bucket is the one with the most tests here. */
export const ACTIVE_WINDOW_MS = 30 * 86_400_000;
/** The picker lists buckets with at least this many eligible tests. */
export const LISTING_MIN_TESTS = 3;

const MODES: readonly string[] = ["casual", "training", "reverse_adaptive", "race"];

/** Rows (newest first) as pooled tests. The bucket is the one stored with
 *  the digest when there is one, else the keyboard bucket of the row. The
 *  session index comes from one splitSessions call over every eligible
 *  test (in every bucket); an ineligible test gets −1. */
export function toPooled(rows: readonly TestSummaryRow[], index: AnalysisIndex,
  digests: ReadonlyMap<string, TestDigestV1>): PooledTest[] {
  const out: PooledTest[] = rows.map((row) => {
    const spec = toBucketSpec(row);
    const entry = index.get(row.id);
    return {
      id: row.id,
      startedAtMs: row.startedAt.getTime(),
      mode: row.mode as TestMode,
      lengthMode: spec.lengthMode,
      length: row.durationOrWordCount,
      wpm: row.wpm,
      accuracy: row.accuracy,
      wasCompleted: row.wasCompleted,
      digest: digests.get(row.id) ?? null,
      bucket: entry?.bucket ?? runBucketKey(spec, false),
      diff: entry?.diff ?? null,
      session: -1,
      indexed: entry !== undefined,
    };
  });
  out.sort((a, b) => b.startedAtMs - a.startedAtMs);
  splitSessions(out.filter(eligible)).forEach((s, i) => s.forEach((t) => (t.session = i)));
  return out;
}

/** Sudden-death runs from before digests existed: Adapt, 30 words, 100%.
 *  The legacy heuristic, used only for rows without a digest. */
function legacySuddenDeath(t: PooledTest): boolean {
  return t.mode === "training" && t.lengthMode === "words" && t.length === 30 && t.accuracy === 100;
}

export function eligible(t: PooledTest): boolean {
  if (t.id.startsWith("mt_") || t.lengthMode === null || !t.wasCompleted) return false;
  if (t.digest) return !t.digest.ctx.suddenDeath && !t.digest.ctx.drill;
  // A stored digest (loaded or not) means not sudden death: recordTestAnalysis
  // never stores one for it. Drill digests don't occur either, since every
  // locked-word drill is sudden death.
  if (t.indexed) return true;
  return !legacySuddenDeath(t);
}

/** One option per bucket with an eligible test, sorted by eligible tests
 *  in the last 30 days, then by the last test. Only well-formed keys
 *  (a known mode and a length unit) become options. */
export function bucketOptions(ts: readonly PooledTest[], nowMs: number): InsightsBucket[] {
  const groups = new Map<string, { opt: InsightsBucket; lately: number }>();
  for (const t of ts) {
    if (!eligible(t)) continue;
    let g = groups.get(t.bucket);
    if (!g) {
      const p = parseRunBucketKey(t.bucket);
      if (!p || p.lengthMode === null || !MODES.includes(p.mode)) continue;
      g = {
        opt: { key: t.bucket, mode: p.mode as TestMode, lengthMode: p.lengthMode, length: p.length, touch: p.touch,
          tests: 0, analysed: 0, lastAtMs: t.startedAtMs },
        lately: 0,
      };
      groups.set(t.bucket, g);
    }
    g.opt.tests++;
    if (t.indexed || t.digest) g.opt.analysed++;
    g.opt.lastAtMs = Math.max(g.opt.lastAtMs, t.startedAtMs);
    if (nowMs - t.startedAtMs <= ACTIVE_WINDOW_MS) g.lately++;
  }
  return [...groups.values()]
    .sort((a, b) => b.lately - a.lately || b.opt.lastAtMs - a.opt.lastAtMs || (a.opt.key < b.opt.key ? -1 : 1))
    .map((g) => g.opt);
}

/** The first option: the most tests in the last 30 days, and when none
 *  has one, the most recent (the sort's tie-break). */
export function defaultBucket(opts: readonly InsightsBucket[], nowMs: number): string | null {
  void nowMs;
  return opts[0]?.key ?? null;
}

/** The requested bucket when it has an eligible test, else the default. */
export function chooseBucket(opts: readonly InsightsBucket[], nowMs: number, requested?: string): string | null {
  if (requested !== undefined && opts.some((o) => o.key === requested)) return requested;
  return defaultBucket(opts, nowMs);
}

/** The picker's listing rule: buckets with 3 or more eligible tests, plus
 *  the default and the chosen one. When none has 3, all of them. */
export function listedBuckets(opts: readonly InsightsBucket[], keep: readonly (string | null)[]): InsightsBucket[] {
  if (!opts.some((o) => o.tests >= LISTING_MIN_TESTS)) return [...opts];
  return opts.filter((o) => o.tests >= LISTING_MIN_TESTS || keep.includes(o.key));
}

/** The bucket's windows, newest first, eligible tests only. The digest
 *  windows apply the same ranges to the tests that have a loaded digest. */
export function windowsFor(ts: readonly PooledTest[], bucket: string): Windows {
  const tests = ts.filter((t) => t.bucket === bucket && eligible(t));
  const withD = tests.filter((t) => t.digest !== null);
  const recent = tests.slice(0, RECENT_N);
  return {
    tests,
    recent,
    earlier: tests.slice(RECENT_N, EARLIER_END),
    usual: tests.slice(0, USUAL_N),
    recentD: withD.slice(0, RECENT_N),
    earlierD: withD.slice(RECENT_N, EARLIER_END),
    usualD: withD.slice(0, USUAL_N),
    sessionsInRecent: new Set(recent.map((t) => t.session)).size,
  };
}

/** The fix mode fixing comparisons use: the newest digest's (§12). */
export function fixKeyOf(w: Windows): FixMode | null {
  return w.usualD[0]?.digest?.ctx.fixMode ?? null;
}

/** Digests whose fix mode is `fixKey` (every fixing statistic uses only these). */
export function sameFix(ts: readonly PooledTest[], fixKey: FixMode | null): PooledTest[] {
  return ts.filter((t) => t.digest !== null && t.digest.ctx.fixMode === fixKey);
}

/** The digest of a test known to have one. */
export const dg = (t: PooledTest): TestDigestV1 => t.digest!;
