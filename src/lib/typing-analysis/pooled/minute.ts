import type { Gate } from "@/types/insights";
import { FRICTION_ORDER, SLICE_ORDER, type FixMode, type FrictionKey, type SliceKey, type SliceSet, type TestDigestV1 } from "@/types/typing-analysis";
import { clamp, largestRemainder, median, quantile, round } from "../stats";
import { dg, sameFix, type PooledTest, type Windows } from "./windows";

/** The typical minute and "your better days" (spec-10 §13.5), in seconds
 *  per minute: m_i(x) = 60·sl_i[x] / ms_i. */

export const MINUTE_MIN = 5;
/** Fixing uses the newest fix mode's digests when it has this many. */
export const FIX_SUBSET_MIN = 3;
const SLICE_INDEX: Record<SliceKey, number> = { typing: 0, fixing: 1, before: 2, inside: 3, breaks: 4 };
const SE_INDEX: Record<FrictionKey, number> = { fixing: 0, before: 1, inside: 2 };

/** Seconds a minute one test spent in a slice. */
export function sPerMin(d: TestDigestV1, x: SliceKey): number {
  return d.ms > 0 ? (60 * d.sl[SLICE_INDEX[x]]) / d.ms : 0;
}
/** The stored jackknife SE (s/min) of a friction slice, when the test had one. */
export function seOf(d: TestDigestV1, x: FrictionKey): number | undefined {
  return d.se ? d.se[SE_INDEX[x]] : undefined;
}

/** Kelley-shrunk Q25: each value is pulled toward the mean by the share
 *  of its spread that is real (V − S over V), so lucky short tests can't
 *  set the target. λ = 0 when the noise is as large as the spread. */
export function kelleyQ25(x: readonly number[], se: readonly (number | undefined)[]): number {
  if (x.length === 0) return NaN;
  const m = x.reduce((s, v) => s + v, 0) / x.length;
  const V = x.length > 1 ? x.reduce((s, v) => s + (v - m) ** 2, 0) / (x.length - 1) : 0;
  const ses = se.filter((s): s is number => s !== undefined && Number.isFinite(s));
  const S = ses.length ? ses.reduce((s, v) => s + v * v, 0) / ses.length : 0;
  const lambda = V > 0 ? Math.max(0, V - S) / V : 0;
  return quantile(x.map((v) => m + lambda * (v - m)), 0.25);
}

/** Friction and breaks as given, typing the remainder (the others scaled
 *  to fit when they pass 60), rounded so the five sum to 60.0 exactly. */
export function fillMinute(parts: Record<Exclude<SliceKey, "typing">, number>): SliceSet {
  const others = (["fixing", "before", "inside", "breaks"] as const).map((k) => Math.max(0, parts[k]));
  const sum = others.reduce((s, v) => s + v, 0);
  const scaled = sum > 60 ? others.map((v) => (v * 60) / sum) : others;
  const typing = Math.max(0, 60 - scaled.reduce((s, v) => s + v, 0));
  const r = largestRemainder([typing, ...scaled], 60, 1);
  return Object.fromEntries(SLICE_ORDER.map((k, i) => [k, r[i]!])) as SliceSet;
}

/** One digest's minute (the learning state's "your last test"). */
export function minuteOfDigest(d: TestDigestV1): SliceSet {
  return fillMinute({ fixing: sPerMin(d, "fixing"), before: sPerMin(d, "before"), inside: sPerMin(d, "inside"), breaks: sPerMin(d, "breaks") });
}

export type Better = Record<FrictionKey, number> & { breaks: number };

/** better(x) for each friction slice over usualD (fixing over the fixKey
 *  subset), and the median breaks. */
export function betterDays(w: Windows, fixKey: FixMode | null): Better {
  const out = { breaks: median(w.usualD.map((t) => sPerMin(dg(t), "breaks"))) } as Better;
  for (const x of FRICTION_ORDER) {
    const ts = x === "fixing" ? sameFix(w.usualD, fixKey) : w.usualD;
    out[x] = ts.length ? kelleyQ25(ts.map((t) => sPerMin(dg(t), x)), ts.map((t) => seOf(dg(t), x))) : 0;
  }
  return out;
}

/** The digests the recent fixing statistics use, and whether the fixing
 *  barrier is suppressed (too few of the newest fix mode). */
export function recentFixing(w: Windows, fixKey: FixMode | null): { ts: PooledTest[]; suppressed: boolean } {
  const subset = sameFix(w.recentD, fixKey);
  return subset.length >= FIX_SUBSET_MIN ? { ts: subset, suppressed: false } : { ts: w.recentD, suppressed: true };
}

export type MinuteResult =
  | { status: "ready"; recent: SliceSet; better: SliceSet; tests: number; flowWpm: number | null;
      keysPerSecond: number | null; catchFactor: number; breakMs: number; coarse: boolean;
      fixMode: FixMode; fixingSuppressed: boolean; betterRaw: Better }
  | { status: "learning"; last: SliceSet | null; gate: Gate };

const medianOr = (xs: readonly number[], fallback: number) => (xs.length ? median(xs) : fallback);

export function minuteOf(w: Windows, fixKey: FixMode | null): MinuteResult {
  const analysed = w.tests.filter((t) => t.digest !== null);
  if (w.recentD.length < MINUTE_MIN) {
    const newest = analysed[0]?.digest ?? null;
    return { status: "learning", last: newest ? minuteOfDigest(newest) : null, gate: { have: analysed.length, need: MINUTE_MIN, unit: "tests" } };
  }
  const fixing = recentFixing(w, fixKey);
  const med = (ts: readonly PooledTest[], x: SliceKey) => median(ts.map((t) => sPerMin(dg(t), x)));
  const recent = fillMinute({
    fixing: med(fixing.ts, "fixing"), before: med(w.recentD, "before"), inside: med(w.recentD, "inside"), breaks: med(w.recentD, "breaks"),
  });
  const betterRaw = betterDays(w, fixKey);
  const better = fillMinute(betterRaw);
  const flows = w.recentD.flatMap((t) => (dg(t).flow !== null ? [dg(t).flow!] : []));
  const flowWpm = flows.length ? round(median(flows), 1) : null;
  return {
    status: "ready",
    recent,
    better,
    tests: w.recentD.length,
    flowWpm,
    keysPerSecond: flowWpm === null ? null : round((flowWpm * 5) / 60, 1),
    catchFactor: round(medianOr(w.recentD.map((t) => clamp(Math.exp(2.33 * dg(t).pace.s), 1.6, 3.0)), 1.6), 1),
    breakMs: Math.round(medianOr(w.recentD.map((t) => Math.max(20 * dg(t).pace.P, 2000)), 2000)),
    coarse: w.recentD.filter((t) => dg(t).q === 1).length * 2 >= w.recentD.length,
    fixMode: fixKey ?? "fix",
    fixingSuppressed: fixing.suppressed,
    betterRaw,
  };
}
