import type { SpeedHeadline, TrendSeries } from "@/types/insights";
import type { FrictionKey } from "@/types/typing-analysis";
import { median, quantile } from "../stats";
import { valueOf, type Adjustment } from "./difficulty";
import { medianDiff, passes, type Unit } from "./usual";
import type { PooledTest, Windows } from "./windows";

/** The trend word and the speed series (spec-10 §13.2). Values are the
 *  adjusted wpm when the bucket is adjusted (§13.4), else raw wpm. */

export const TREND_MIN_TESTS = 15;
export const TREND_MIN_EARLIER = 5;
export const TREND_MIN_SESSIONS = 2;
const TREND_Z = 2;
const SERIES_MAX = 500;
const DOWNSAMPLE_OVER = 150;
const MEDIAN_WINDOW = 10;
const MEDIAN_MIN = 3;
const BAND_WINDOW = 20;
const BAND_MIN = 8;
const DAY = 86_400_000;

export type Trend = SpeedHeadline["trend"];
/** A friction change that passed its noise gate (from changes.ts). */
export type FrictionMove = { kind: FrictionKey; direction: "better" | "worse"; before: number; after: number };

export const unitsOf = (ts: readonly PooledTest[], adj: Adjustment): Unit[] =>
  ts.map((t) => ({ v: valueOf(adj, t), session: t.session }));

/** wpm a change of Δs seconds a minute is worth at speed W. */
export const wpmWorth = (W: number, ds: number): number => (Math.abs(ds) >= 60 ? Infinity : W * (60 / (60 - Math.abs(ds)) - 1));

export function trendOf(w: Windows, adj: Adjustment, o: {
  plateau: { weeks: number } | null; friction: readonly FrictionMove[]; W: number;
}): Trend {
  const n = w.tests.length;
  const base = { deltaWpm: null, earlierN: w.earlier.length, sinceMs: null, weeks: null, explanation: null };
  if (n < TREND_MIN_TESTS || w.earlier.length < TREND_MIN_EARLIER) {
    return { ...base, state: "early", gate: { have: n, need: TREND_MIN_TESTS, unit: "tests" } };
  }
  if (w.sessionsInRecent < TREND_MIN_SESSIONS) {
    return { ...base, state: "early", gate: { have: w.sessionsInRecent, need: TREND_MIN_SESSIONS, unit: "sessions" } };
  }
  const r = medianDiff(unitsOf(w.recent, adj), unitsOf(w.earlier, adj));
  const d = r.d;
  const min = Math.max(1.5, 0.02 * median(w.earlier.map((t) => valueOf(adj, t))));
  const real = passes(r, TREND_Z) && Math.abs(d) >= min;
  const state = real && d > 0 ? "improving" : real && d < 0 ? "slipping" : "steady";
  const since = w.earlier[Math.floor((w.earlier.length - 1) / 2)]!.startedAtMs;
  if (state === "steady") {
    if (o.plateau) return { ...base, state: "levelled", sinceMs: since, weeks: o.plateau.weeks, gate: null };
    return { ...base, state, sinceMs: since, gate: null };
  }
  const want = state === "improving" ? "better" : "worse";
  let explanation: FrictionKey | null = null;
  let best = 0;
  for (const m of o.friction) {
    const worth = wpmWorth(o.W, m.after - m.before);
    if (m.direction === want && worth >= 0.5 * Math.abs(d) && worth > best) {
      best = worth;
      explanation = m.kind;
    }
  }
  return { ...base, state, deltaWpm: Math.round(Math.abs(d)), sinceMs: since, explanation, gate: null };
}

type Point = TrendSeries["points"][number];

/** One median point per UTC day over that day's other tests (value, wpm
 *  and accuracy, at the median time), and every personal best as its own
 *  point, in time order. A personal best never splits its day. */
function downsample(points: readonly Point[]): Point[] {
  const out: Point[] = [];
  const days = new Map<number, Point[]>();
  for (const p of points) {
    if (p.pb) {
      out.push(p);
      continue;
    }
    const key = Math.floor(p.t / DAY);
    const day = days.get(key);
    if (day) day.push(p);
    else days.set(key, [p]);
  }
  for (const day of days.values()) {
    out.push({
      t: Math.round(median(day.map((p) => p.t))), wpm: median(day.map((p) => p.wpm)),
      value: median(day.map((p) => p.value)), acc: median(day.map((p) => p.acc)), pb: false,
    });
  }
  return out.sort((a, b) => a.t - b.t);
}

/** Keeps the last rolling-statistic entry of each output point's day, so
 *  the line and band stay aligned with a downsampled series. */
function lastPerDay<T extends { t: number }>(xs: readonly T[]): T[] {
  const out: T[] = [];
  for (const x of xs) {
    const prev = out[out.length - 1];
    if (prev && Math.floor(prev.t / DAY) === Math.floor(x.t / DAY)) out[out.length - 1] = x;
    else out.push(x);
  }
  return out;
}

/** Up to 500 tests, oldest to newest; null below 2 tests. */
export function trendSeries(tests: readonly PooledTest[], adj: Adjustment): TrendSeries | null {
  if (tests.length < 2) return null;
  const chrono = tests.slice(0, SERIES_MAX).reverse();
  let best = -Infinity;
  // Pooled tests (`typed` set) span lengths, so no typed speed among them
  // is a personal best of anything: none is marked.
  const pooled = tests.some((t) => t.typed !== undefined);
  const points: Point[] = chrono.map((t, i) => {
    const typed = t.typed?.wpm ?? t.wpm;
    const pb = !pooled && i > 0 && typed > best;
    best = Math.max(best, typed);
    return { t: t.startedAtMs, wpm: typed, value: valueOf(adj, t), acc: t.typed?.accuracy ?? t.accuracy, pb };
  });
  const values = points.map((p) => p.value);
  const median10: TrendSeries["median"] = [];
  const band: TrendSeries["band"] = [];
  points.forEach((p, i) => {
    if (i + 1 >= MEDIAN_MIN) median10.push({ t: p.t, v: median(values.slice(Math.max(0, i + 1 - MEDIAN_WINDOW), i + 1)) });
    if (i + 1 >= BAND_MIN) {
      const win = values.slice(Math.max(0, i + 1 - BAND_WINDOW), i + 1);
      band.push({ t: p.t, lo: quantile(win, 0.1), hi: quantile(win, 0.9) });
    }
  });
  const flags = { adjusted: adj.adjusted, scaled: pooled };
  if (points.length <= DOWNSAMPLE_OVER) return { points, median: median10, band, ...flags };
  return { points: downsample(points), median: lastPerDay(median10), band: lastPerDay(band), ...flags };
}
