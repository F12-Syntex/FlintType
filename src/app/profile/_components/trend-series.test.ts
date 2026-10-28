import { describe, expect, it } from "vitest";
import { deriveTrend, type TrendPoint } from "./derive-stats";
import {
  dayTickIndices,
  downsampleTrend,
  filterTrendByRange,
  meanTrendWpm,
} from "./trend-series";
import type { HistoryTest } from "@/types/history";

const DAY = 86_400_000;
const pts = (n: number, start = 0, step = DAY): TrendPoint[] =>
  Array.from({ length: n }, (_, i) => ({
    idx: i + 1,
    wpm: 100 + i,
    ts: start + i * step,
  }));

describe("filterTrendByRange", () => {
  it("keeps everything for the all-time range", () => {
    expect(filterTrendByRange(pts(5), null, 10 * DAY)).toHaveLength(5);
  });

  it("drops runs older than the window", () => {
    // Runs at day 0..9, now = day 10, last week → days 3..9.
    const kept = filterTrendByRange(pts(10), 7 * DAY, 10 * DAY);
    expect(kept.map((p) => p.idx)).toEqual([4, 5, 6, 7, 8, 9, 10]);
  });
});

describe("meanTrendWpm", () => {
  it("is 0 with no runs", () => {
    expect(meanTrendWpm([])).toBe(0);
  });

  it("averages every run", () => {
    expect(meanTrendWpm(pts(3))).toBe(101);
  });
});

describe("downsampleTrend", () => {
  it("passes short series through one run per bucket", () => {
    const out = downsampleTrend(pts(5), 80);
    expect(out).toHaveLength(5);
    expect(out.map((b) => b.count)).toEqual([1, 1, 1, 1, 1]);
    expect(out[2]).toMatchObject({ x: 2, wpm: 102, fromTs: 2 * DAY });
  });

  it("caps long series at maxPoints with equal buckets", () => {
    const out = downsampleTrend(pts(300), 80);
    expect(out.length).toBeLessThanOrEqual(80);
    // ceil(300 / 80) = 4 runs per bucket → 75 buckets.
    expect(out).toHaveLength(75);
    expect(out.every((b) => b.count === 4)).toBe(true);
    // First bucket averages runs 100..103.
    expect(out[0].wpm).toBe(101.5);
    expect(out[0].fromTs).toBe(0);
    expect(out[0].toTs).toBe(3 * DAY);
    expect(out.map((b) => b.x)).toEqual(out.map((_, i) => i));
  });

  it("keeps every run's weight (bucket counts sum to the input)", () => {
    const out = downsampleTrend(pts(203), 60);
    expect(out.reduce((s, b) => s + b.count, 0)).toBe(203);
  });

  it("returns nothing for no runs", () => {
    expect(downsampleTrend([])).toEqual([]);
  });
});

describe("deriveTrend", () => {
  const mk = (i: number, done = true): HistoryTest => ({
    id: `t${i}`,
    startedAtMs: i * DAY,
    completedAtMs: i * DAY + 30_000,
    mode: "casual",
    durationOrWordCount: 25,
    lengthMode: "words",
    wpm: 100 + i,
    accuracy: 98,
    errorCount: 0,
    wasCompleted: done,
  });

  it("keeps every completed run by default, oldest first", () => {
    // recentTests arrive newest-first.
    const tests = Array.from({ length: 120 }, (_, i) => mk(119 - i));
    const trend = deriveTrend(tests);
    expect(trend).toHaveLength(120);
    expect(trend[0]).toMatchObject({ idx: 1, ts: 0 });
    expect(trend[119]).toMatchObject({ idx: 120, ts: 119 * DAY });
  });

  it("numbers a capped slice by its true position", () => {
    const tests = Array.from({ length: 10 }, (_, i) => mk(9 - i));
    const trend = deriveTrend(tests, 3);
    expect(trend.map((p) => p.idx)).toEqual([8, 9, 10]);
  });

  it("skips unfinished runs", () => {
    const trend = deriveTrend([mk(2), mk(1, false), mk(0)]);
    expect(trend.map((p) => p.ts)).toEqual([0, 2 * DAY]);
  });
});

describe("dayTickIndices", () => {
  const HOUR = 3_600_000;
  // Local midnight so day boundaries are deterministic in any TZ.
  const base = new Date(2026, 0, 5).getTime();

  it("labels each day once, at its first point", () => {
    const series = downsampleTrend(
      [0, 2, 5, 26, 28, 50].map((h, i) => ({
        idx: i + 1,
        wpm: 100,
        ts: base + h * HOUR,
      })),
    );
    expect(dayTickIndices(series)).toEqual([0, 3, 5]);
  });

  it("thins long spans to at most maxTicks", () => {
    const series = downsampleTrend(pts(30, base, DAY));
    const ticks = dayTickIndices(series, 6);
    expect(ticks.length).toBeLessThanOrEqual(6);
    expect(ticks[0]).toBe(0);
  });

  it("returns nothing for an empty series", () => {
    expect(dayTickIndices([])).toEqual([]);
  });
});
