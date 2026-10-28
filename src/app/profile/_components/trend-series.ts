import type { TrendPoint } from "./derive-stats";

/** One plotted point of the WPM trend. A bucket is one run when the
 *  range is short, or the mean of several consecutive runs once the
 *  range holds more runs than the chart can show legibly. */
export type TrendBucket = {
  /** 0-based position in the plotted series (the chart's x key). */
  x: number;
  /** Mean WPM over the runs in this bucket. */
  wpm: number;
  /** Start time of the bucket's first and last run. */
  fromTs: number;
  toTs: number;
  /** How many runs the bucket averages. */
  count: number;
};

/** Default cap on plotted points: dense enough to show shape, sparse
 *  enough that the line never turns into noise. */
export const TREND_MAX_POINTS = 80;

/** Keep the runs inside the last `rangeMs` before `now` (all of them
 *  when `rangeMs` is null). Input order is preserved. */
export function filterTrendByRange(
  points: readonly TrendPoint[],
  rangeMs: number | null,
  now: number,
): TrendPoint[] {
  if (rangeMs == null) return [...points];
  const cutoff = now - rangeMs;
  return points.filter((p) => p.ts >= cutoff);
}

/** Mean WPM of the given runs (0 when there are none). Computed on the
 *  range-filtered runs, before downsampling, so the average is exact. */
export function meanTrendWpm(points: readonly TrendPoint[]): number {
  if (points.length === 0) return 0;
  return points.reduce((s, p) => s + p.wpm, 0) / points.length;
}

/** Downsample chronological runs to at most `maxPoints` buckets of
 *  equal size (the last one may be smaller), each the mean WPM of its
 *  runs. Short series pass through one run per bucket. */
export function downsampleTrend(
  points: readonly TrendPoint[],
  maxPoints = TREND_MAX_POINTS,
): TrendBucket[] {
  if (points.length === 0) return [];
  const cap = Math.max(1, Math.floor(maxPoints));
  const size = Math.ceil(points.length / cap);
  const out: TrendBucket[] = [];
  for (let i = 0; i < points.length; i += size) {
    const chunk = points.slice(i, i + size);
    out.push({
      x: out.length,
      wpm: meanTrendWpm(chunk),
      fromTs: chunk[0].ts,
      toTs: chunk[chunk.length - 1].ts,
      count: chunk.length,
    });
  }
  return out;
}

/** Longest span (ms) the trend axis labels by time of day; anything
 *  longer is labelled by date. */
export const TIME_AXIS_MAX_SPAN_MS = 26 * 3_600_000;

/** X positions for date ticks: the first bucket of each local calendar
 *  day (so a day is never labelled twice), thinned evenly to at most
 *  `maxTicks`. */
export function dayTickIndices(
  series: readonly TrendBucket[],
  maxTicks = 6,
): number[] {
  const starts: number[] = [];
  let lastDay = "";
  for (const b of series) {
    const day = new Date(b.toTs).toDateString();
    if (day !== lastDay) {
      starts.push(b.x);
      lastDay = day;
    }
  }
  const cap = Math.max(1, Math.floor(maxTicks));
  if (starts.length <= cap) return starts;
  const step = Math.ceil(starts.length / cap);
  return starts.filter((_, i) => i % step === 0);
}
