import { ALL_ADAPT_BUCKET, type InsightsBucket } from "@/types/insights";
import { clamp, median } from "../stats";
import { parseRunBucketKey } from "@/lib/test-bucket";
import { bucketOptions, eligible, USUAL_N, type PooledTest } from "./windows";

/** The pooled "All Adapt tests" view: every Adapt test, of every length
 *  and input, in one set of windows. Speed and accuracy depend on a
 *  test's conditions (a 15 second test runs faster than a 120 second
 *  one), so each test is first put on one footing: scaled by how its
 *  own kind's usual compares with the anchor kind's usual.
 *
 *    speed    × anchor usual speed / its kind's usual speed
 *    accuracy + anchor usual accuracy − its kind's usual accuracy
 *
 *  "Kind" is the runBucketKey bucket (mode, length unit, length, touch),
 *  and "usual" is the median of its newest USUAL_N eligible tests, the
 *  same window every other model calls usual. The anchor is the kind
 *  played most among the newest ANCHOR_WINDOW Adapt tests, so figures
 *  read as "in your usual kind of Adapt test". A kind needs POOL_MIN
 *  tests before its usual is trusted; until then its tests are left out
 *  (and counted, so the page can say so). The digests ride along
 *  unchanged: time slices are per minute, so they pool across lengths.
 *  Pure. */

export const POOL_MIN = 5;
/** The anchor is the most played kind among this many newest tests. */
export const ANCHOR_WINDOW = 50;

export type AllAdapt = {
  /** Scaled copies, newest first, keyed to ALL_ADAPT_BUCKET. */
  tests: PooledTest[];
  /** The kinds pooled, anchor first. */
  kinds: string[];
  /** Eligible Adapt tests of kinds with fewer than POOL_MIN tests. */
  leftOut: number;
};

export function allAdapt(ts: readonly PooledTest[]): AllAdapt | null {
  const adapt = ts.filter((t) => t.mode === "training" && eligible(t));
  const byKind = new Map<string, PooledTest[]>();
  for (const t of adapt) {
    const list = byKind.get(t.bucket) ?? [];
    list.push(t);
    byKind.set(t.bucket, list);
  }
  const pooled = [...byKind.entries()].filter(([key, list]) =>
    list.length >= POOL_MIN && parseRunBucketKey(key)?.lengthMode != null);
  if (pooled.length === 0) return null;

  const recent = new Map<string, number>();
  for (const t of adapt.slice(0, ANCHOR_WINDOW)) recent.set(t.bucket, (recent.get(t.bucket) ?? 0) + 1);
  pooled.sort(([ka, a], [kb, b]) =>
    (recent.get(kb) ?? 0) - (recent.get(ka) ?? 0)
    || b.length - a.length
    || b[0]!.startedAtMs - a[0]!.startedAtMs
    || (ka < kb ? -1 : 1));

  const usualOf = (list: PooledTest[]) => {
    const u = list.slice(0, USUAL_N);
    return { speed: median(u.map((t) => t.wpm)), acc: median(u.map((t) => t.accuracy)) };
  };
  const anchor = usualOf(pooled[0]![1]);
  const scale = new Map(pooled.map(([key, list]) => {
    const u = usualOf(list);
    return [key, { speed: u.speed > 0 ? anchor.speed / u.speed : 1, acc: anchor.acc - u.acc }];
  }));

  const tests = adapt.flatMap((t) => {
    const s = scale.get(t.bucket);
    if (!s) return [];
    return [{
      ...t,
      wpm: t.wpm * s.speed,
      accuracy: clamp(t.accuracy + s.acc, 0, 100),
      typed: { wpm: t.wpm, accuracy: t.accuracy },
      bucket: ALL_ADAPT_BUCKET,
    }];
  });
  return { tests, kinds: pooled.map(([key]) => key), leftOut: adapt.length - tests.length };
}

/** The picker option for the pooled view, named after its anchor kind;
 *  null when no Adapt kind has POOL_MIN tests. */
export function allAdaptOption(ts: readonly PooledTest[]): InsightsBucket | null {
  const all = allAdapt(ts);
  if (!all) return null;
  const anchor = parseRunBucketKey(all.kinds[0]!)!;
  return {
    key: ALL_ADAPT_BUCKET,
    mode: "training",
    lengthMode: anchor.lengthMode!,
    length: anchor.length,
    touch: anchor.touch,
    tests: all.tests.length,
    analysed: all.tests.filter((t) => t.indexed || t.digest !== null).length,
    lastAtMs: all.tests[0]!.startedAtMs,
    all: { kinds: all.kinds.length, leftOut: all.leftOut },
  };
}

/** The picker's options: the pooled view first (so it is the default
 *  whenever it exists), then one per kind of test (`bucketOptions`). */
export function insightsOptions(ts: readonly PooledTest[], nowMs: number): InsightsBucket[] {
  const all = allAdaptOption(ts);
  const kinds = bucketOptions(ts, nowMs);
  return all ? [all, ...kinds] : kinds;
}
