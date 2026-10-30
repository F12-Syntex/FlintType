import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { convertSpeed } from "@/lib/speed-unit";
import type { TrendSeries } from "@/types/insights";
import { localDay } from "./trend-ticks";

/** Pure shaping for "Your speed over time" (spec-40 §3.5): the range
 *  switch, chart rows (with the drawn usual-range band at each point for
 *  the tooltip), the y scale and the table twin. Date ticks are in
 *  trend-ticks.ts. Speeds come out in the user's unit. */

export type TrendRange = "1M" | "3M" | "all";
const DAY = 86_400_000;
const RANGE_DAYS: Record<TrendRange, number | null> = { "1M": 30, "3M": 90, all: null };

export const TREND_RANGES: readonly { value: TrendRange; short: string; label: string }[] = [
  { value: "1M", short: "1M", label: "Last month" },
  { value: "3M", short: "3M", label: "Last 3 months" },
  { value: "all", short: "All", label: "All time" },
];

/** 3M, or All while the bucket has fewer than 30 tests. Counts tests,
 *  not points: a long series comes downsampled to one point a day. Also
 *  All when the last 3 months hold fewer than 2 points (back after a
 *  break), so the chart never opens empty. */
export function defaultRange(tests: number, series?: TrendSeries | null, nowMs?: number): TrendRange {
  if (tests < 30) return "all";
  if (series && nowMs !== undefined) {
    const from = nowMs - RANGE_DAYS["3M"]! * DAY;
    if (series.points.filter((p) => p.t >= from).length < 2) return "all";
  }
  return "3M";
}

/** The server's series cap and downsampling (pooled/trend.ts): up to
 *  500 tests, and one point a day once there are more than 150. */
const SERIES_MAX = 500;

/** True when the points are days, not tests: fewer points than tests
 *  (up to the cap) means the server folded each day into its middle. */
export function isDaily(series: TrendSeries, tests: number): boolean {
  return series.points.length < Math.min(tests, SERIES_MAX);
}

export type TrendRow = {
  t: number;
  /** Speed as charted (adjusted when the series is), in the user's unit. */
  value: number;
  /** The same speed in wpm, for comparing with the usual range. */
  valueWpm: number;
  /** The speed actually typed, in wpm (never adjusted). */
  typedWpm: number;
  acc: number;
  /** A personal best by typed speed (a single test even when daily). */
  pb: boolean;
  /** The middle of a day's tests rather than one test (daily view). */
  day: boolean;
  median: number | null;
  band: [number, number] | null;
  /** The usual-range band as drawn at this point's x, in wpm (null
   *  where no band is drawn). The tooltip judges the point against it,
   *  not against today's range, so a dot inside the shaded band always
   *  reads "inside your usual range" (`drawnBandAt`). */
  ref: [number, number] | null;
};

/** A lookup of a rolling statistic as of a point. The server keeps one
 *  entry per point (same `t`), or, for a long series downsampled to one
 *  point a day, the last entry of each UTC day: then a point takes its
 *  day's entry, else the newest one before it. */
function statAt<T extends { t: number }>(xs: readonly T[], pointTs: ReadonlySet<number>): (t: number) => T | null {
  const byT = new Map(xs.map((x) => [x.t, x]));
  if (xs.every((x) => pointTs.has(x.t))) return (t) => byT.get(t) ?? null;
  const byDay = new Map(xs.map((x) => [Math.floor(x.t / DAY), x]));
  return (t) => {
    const same = byDay.get(Math.floor(t / DAY));
    if (same) return same;
    let before: T | null = null;
    for (const x of xs) {
      if (x.t >= t) break;
      before = x;
    }
    return before;
  };
}

type Edge = { t: number; lo: number; hi: number };

/** The band as the chart draws it: a straight line in time between the
 *  day ends that carry a band (the Area is `type="linear"` with
 *  `connectNulls`). A day end keeps its own band; any other point takes
 *  the line between the day ends before and after it. Null before the
 *  first and after the last, and everywhere when fewer than 2 day ends
 *  have a band, since then no band is drawn (`drawnMarks`). */
export function drawnBandAt(ends: readonly Edge[]): (t: number) => [number, number] | null {
  if (ends.length < 2) return () => null;
  return (t) => {
    const i = ends.findIndex((e) => e.t >= t);
    if (i < 0) return null;
    const b = ends[i]!;
    if (b.t === t) return [b.lo, b.hi];
    if (i === 0) return null;
    const a = ends[i - 1]!;
    const f = (t - a.t) / (b.t - a.t);
    return [a.lo + f * (b.lo - a.lo), a.hi + f * (b.hi - a.hi)];
  };
}

/** Each point on show with the rolling median and band as of it. The
 *  line and band are drawn through each calendar day's last test only:
 *  tests minutes apart would otherwise turn the line into vertical
 *  steps. Every point keeps its own dot, and its tooltip reference is
 *  the band drawn at its x. */
export function trendRows(
  series: TrendSeries,
  range: TrendRange,
  nowMs: number,
  unit: TypingSpeedUnit,
  daily = false,
): TrendRow[] {
  const days = RANGE_DAYS[range];
  const from = days === null ? -Infinity : nowMs - days * DAY;
  const ts = new Set(series.points.map((p) => p.t));
  const medianAt = statAt(series.median, ts);
  const bandAt = statAt(series.band, ts);
  const conv = (v: number) => convertSpeed(v, unit);
  const shown = series.points.filter((p) => p.t >= from);
  const marks = shown.map((p, i) => {
    const dayEnd = i === shown.length - 1 || localDay(shown[i + 1]!.t) !== localDay(p.t);
    return { p, m: dayEnd ? medianAt(p.t) : null, b: dayEnd ? bandAt(p.t) : null };
  });
  const refAt = drawnBandAt(marks.flatMap(({ p, b }) => (b ? [{ t: p.t, lo: b.lo, hi: b.hi }] : [])));
  return marks.map(({ p, m, b }) => ({
    t: p.t,
    value: conv(p.value),
    valueWpm: p.value,
    typedWpm: p.wpm,
    acc: p.acc,
    pb: p.pb,
    day: daily && !p.pb,
    median: m ? conv(m.v) : null,
    band: b ? [conv(b.lo), conv(b.hi)] : null,
    ref: refAt(p.t),
  }));
}

const STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000];

/** Which rolling marks are drawn: a line or band needs 2 points, or it
 *  is an unexplained speck (the legend uses the same rule). */
export function drawnMarks(rows: readonly TrendRow[]): { median: boolean; band: boolean } {
  return {
    median: rows.filter((r) => r.median !== null).length >= 2,
    band: rows.filter((r) => r.band !== null).length >= 2,
  };
}

/** The y scale: every dot, and the line and band when drawn, on evenly
 *  spaced round ticks (at most 5) with the domain ending on a tick. */
export function yScale(
  rows: readonly TrendRow[],
  drawn: { median: boolean; band: boolean } = drawnMarks(rows),
): { domain: [number, number]; ticks: number[] } {
  const vs = rows.flatMap((r) => [
    r.value,
    ...(drawn.median && r.median !== null ? [r.median] : []),
    ...(drawn.band && r.band ? r.band : []),
  ]);
  if (vs.length === 0) return { domain: [0, 1], ticks: [0, 1] };
  let lo = Math.min(...vs);
  let hi = Math.max(...vs);
  if (hi - lo < 1e-9) {
    lo -= Math.max(1, Math.abs(lo) * 0.05);
    hi += Math.max(1, Math.abs(hi) * 0.05);
  }
  const step = STEPS.find((s) => Math.ceil(hi / s) - Math.floor(lo / s) <= 4) ?? STEPS[STEPS.length - 1]!;
  const from = Math.max(0, Math.floor(lo / step) * step);
  const to = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let t = from; t <= to + step / 2; t += step) ticks.push(Math.round(t * 100) / 100);
  return { domain: [from, ticks[ticks.length - 1]!], ticks };
}

/** The table twin: the newest 30 points on show, newest first. */
export function tableRows(rows: readonly TrendRow[], limit = 30): TrendRow[] {
  return rows.slice(-limit).reverse();
}

/** Facts under the chart, over the whole bucket: best typed speed and
 *  the first test's time. */
export function seriesFacts(series: TrendSeries): { best: number; firstMs: number } {
  let best = 0;
  for (const p of series.points) best = Math.max(best, p.wpm);
  return { best, firstMs: series.points[0]?.t ?? 0 };
}
