import { describe, expect, it } from "vitest";
import type { TrendSeries } from "@/types/insights";
import { rangePosition } from "./trend-copy";
import {
  defaultRange,
  drawnBandAt,
  drawnMarks,
  isDaily,
  seriesFacts,
  tableRows,
  type TrendRow,
  trendRows,
  yScale,
} from "./trend-data";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 29, 12);

function series(n: number, o: { adjusted?: boolean; every?: number } = {}): TrendSeries {
  const every = o.every ?? DAY;
  const points = Array.from({ length: n }, (_, i) => ({
    t: NOW - (n - i) * every, wpm: 70 + (i % 5), value: o.adjusted ? 72 + (i % 5) : 70 + (i % 5), acc: 96, pb: i === 3,
  }));
  return {
    points,
    median: points.slice(2).map((p) => ({ t: p.t, v: 72 })),
    band: points.slice(7).map((p) => ({ t: p.t, lo: 68, hi: 76 })),
    adjusted: !!o.adjusted,
    scaled: false,
  };
}

describe("ranges", () => {
  it("defaults to All below 30 tests, else 3M, counting tests not points", () => {
    expect(defaultRange(29)).toBe("all");
    expect(defaultRange(30)).toBe("3M");
    // 200 tests downsampled to 25 days still defaults to 3M.
    expect(defaultRange(200)).toBe("3M");
    expect(defaultRange(40, series(40), NOW)).toBe("3M");
  });
  it("opens on All when the last 3 months hold fewer than 2 points", () => {
    const old = series(40, { every: DAY });
    const shifted = { ...old, points: old.points.map((p) => ({ ...p, t: p.t - 120 * DAY })) };
    expect(defaultRange(40, shifted, NOW)).toBe("all");
    const oneRecent = { ...shifted, points: [...shifted.points.slice(0, -1), { ...shifted.points[39]!, t: NOW - DAY }] };
    expect(defaultRange(40, oneRecent, NOW)).toBe("all");
  });
  it("filters by the last month or three", () => {
    const s = series(120);
    expect(trendRows(s, "all", NOW, "wpm")).toHaveLength(120);
    expect(trendRows(s, "3M", NOW, "wpm")).toHaveLength(90);
    expect(trendRows(s, "1M", NOW, "wpm")).toHaveLength(30);
  });
});

describe("trendRows", () => {
  it("attaches the rolling median and band of the same point", () => {
    const rows = trendRows(series(10), "all", NOW, "wpm");
    expect(rows[0]!.median).toBeNull();
    expect(rows[2]!.median).toBe(72);
    expect(rows[6]!.band).toBeNull();
    expect(rows[7]!.band).toEqual([68, 76]);
    expect(rows[3]!.pb).toBe(true);
  });
  it("draws the line and band through each day's last test only", () => {
    const s = series(12, { every: 3_600_000 });
    const rows = trendRows(s, "all", NOW, "wpm");
    const ends = rows.filter((r) => r.median !== null).map((r) => new Date(r.t).toDateString());
    expect(new Set(ends).size).toBe(ends.length);
    expect(rows[rows.length - 1]!.median).toBe(72);
    expect(rows.filter((r) => r.median === null).length).toBeGreaterThan(0);
  });
  it("judges each dot against the band drawn at its x", () => {
    // Three days, three tests each at 10:20, 10:30 and 10:40 UTC (one
    // local day in every IANA time zone, Chatham's +13:45 included).
    // The band is drawn through each day's last test only: [60, 70] on
    // day 1, [60, 80] on day 2.
    const day1 = Date.UTC(2026, 9, 1, 10, 20);
    const at = (d: number, k: number) => day1 + d * DAY + k * 10 * 60_000;
    const values = [64, 65, 66, 74, 70, 71, 72, 73, 74];
    const points = values.map((v, i) => ({ t: at(Math.floor(i / 3), i % 3), wpm: v, value: v, acc: 96, pb: false }));
    // Each point's own rolling band as it stood then. Day 2's first
    // test (74) sits above its own band [60, 72], but inside the band
    // drawn at its x, which is nearly day 2's [60, 80].
    const own = [[60, 69], [60, 69], [60, 70], [60, 72], [60, 76], [60, 80], [61, 80], [61, 81], [62, 82]];
    const band = points.map((p, i) => ({ t: p.t, lo: own[i]![0]!, hi: own[i]![1]! }));
    const rows = trendRows({ points, median: [], band, adjusted: false, scaled: false }, "all", NOW, "cpm");
    expect(rows.map((r) => r.band !== null)).toEqual([false, false, true, false, false, true, false, false, true]);
    // Before the first drawn band there is no range line, own band or not.
    expect(rows[0]!.ref).toBeNull();
    expect(rows[1]!.ref).toBeNull();
    // A day end keeps its own band, in wpm whatever the unit.
    expect(rows[2]!.ref).toEqual([60, 70]);
    expect(rows[5]!.ref).toEqual([60, 80]);
    expect(rows[8]!.ref).toEqual([62, 82]);
    // Any other dot takes the straight line between the day ends.
    const f = (at(1, 0) - at(0, 2)) / (at(1, 2) - at(0, 2));
    expect(rows[3]!.ref![0]).toBeCloseTo(60, 9);
    expect(rows[3]!.ref![1]).toBeCloseTo(70 + f * 10, 9);
    expect(rangePosition(rows[3]!.valueWpm, rows[3]!.ref)).toBe("Inside your usual range at the time");
    expect(rangePosition(rows[4]!.valueWpm, rows[4]!.ref)).toBe("Inside your usual range at the time");
  });
  it("gives no range line when the band is not drawn", () => {
    // Only the last day end has a band: one point draws no band.
    const s = series(10, { every: DAY });
    const one = { ...s, band: s.band.slice(-1) };
    const rows = trendRows(one, "all", NOW, "wpm");
    expect(drawnMarks(rows).band).toBe(false);
    expect(rows.every((r) => r.ref === null)).toBe(true);
  });
  it("interpolates by time between day ends, and nothing outside them", () => {
    const at = drawnBandAt([
      { t: 100, lo: 60, hi: 70 },
      { t: 200, lo: 64, hi: 80 },
      { t: 400, lo: 64, hi: 80 },
    ]);
    expect(at(99)).toBeNull();
    expect(at(100)).toEqual([60, 70]);
    expect(at(150)).toEqual([62, 75]);
    expect(at(200)).toEqual([64, 80]);
    expect(at(300)).toEqual([64, 80]);
    expect(at(400)).toEqual([64, 80]);
    expect(at(401)).toBeNull();
    expect(drawnBandAt([{ t: 100, lo: 60, hi: 70 }])(100)).toBeNull();
    expect(drawnBandAt([])(0)).toBeNull();
  });
  it("converts to the user's unit and keeps the typed speed apart", () => {
    const rows = trendRows(series(5, { adjusted: true }), "all", NOW, "cpm");
    expect(rows[0]!.value).toBe(360);
    expect(rows[0]!.valueWpm).toBe(72);
    expect(rows[0]!.typedWpm).toBe(70);
  });
  it("matches a downsampled day to that day's statistic", () => {
    // Points 24 hours apart, so each is its own local day in every
    // time zone; the statistics are matched by UTC day.
    const day0 = Date.UTC(2026, 9, 1);
    const p = (d: number) => day0 + d * DAY + 10 * 3_600_000 + 20 * 60_000;
    const s: TrendSeries = {
      points: [
        { t: p(0), wpm: 70, value: 70, acc: 96, pb: false },
        { t: p(1), wpm: 72, value: 72, acc: 96, pb: false },
        { t: p(3), wpm: 74, value: 74, acc: 96, pb: false },
      ],
      median: [
        { t: day0 + 20 * 3_600_000, v: 70.5 },
        { t: day0 + DAY + 20 * 3_600_000, v: 71.5 },
      ],
      band: [],
      adjusted: false,
      scaled: false,
    };
    const rows = trendRows(s, "all", NOW, "wpm");
    expect(rows.map((r) => r.median)).toEqual([70.5, 71.5, 71.5]);
    expect(rows.every((r) => r.band === null)).toBe(true);
  });
});

describe("daily (downsampled) series", () => {
  it("is daily when there are fewer points than tests, up to the 500 cap", () => {
    expect(isDaily(series(140), 140)).toBe(false);
    expect(isDaily(series(25), 200)).toBe(true);
    expect(isDaily(series(500), 900)).toBe(false);
    expect(isDaily(series(120), 900)).toBe(true);
  });
  it("marks each non-best point as a day; a best stays a test", () => {
    const rows = trendRows(series(10), "all", NOW, "wpm", true);
    expect(rows.filter((r) => r.day)).toHaveLength(9);
    expect(rows[3]!.pb).toBe(true);
    expect(rows[3]!.day).toBe(false);
    expect(trendRows(series(10), "all", NOW, "wpm").some((r) => r.day)).toBe(false);
  });
});

describe("adjusted series", () => {
  it("keeps the raw best flag and both figures, so the copy can tell them apart", () => {
    const s = series(6, { adjusted: true });
    const rows = trendRows(s, "all", NOW, "wpm");
    expect(rows[3]!.pb).toBe(true);
    expect(rows[3]!.valueWpm).toBe(75);
    expect(rows[3]!.typedWpm).toBe(73);
    // The best figure under the chart is the best typed speed.
    expect(seriesFacts(s).best).toBe(74);
  });
});

describe("drawn marks", () => {
  const row = (o: Partial<TrendRow>): TrendRow => ({
    t: 0, value: 70, valueWpm: 70, typedWpm: 70, acc: 96, pb: false, day: false, median: null, band: null, ref: null, ...o,
  });
  it("draws a line or band only from 2 points", () => {
    expect(drawnMarks([row({ median: 61 }), row({}), row({})])).toEqual({ median: false, band: false });
    expect(drawnMarks([row({ median: 61, band: [60, 62] }), row({ median: 62, band: [60, 63] })])).toEqual({
      median: true, band: true,
    });
  });
  it("leaves an undrawn median out of the y scale", () => {
    const rows = [row({ value: 70 }), row({ value: 71, median: 200 })];
    expect(yScale(rows).domain[1]).toBeLessThan(100);
  });
});

describe("yScale", () => {
  it("covers every mark on round, even ticks", () => {
    const { domain, ticks } = yScale(trendRows(series(10), "all", NOW, "wpm"));
    expect(domain[0]).toBeLessThanOrEqual(68);
    expect(domain[1]).toBeGreaterThanOrEqual(76);
    expect(ticks.length).toBeLessThanOrEqual(5);
    expect(ticks[0]).toBe(domain[0]);
    expect(ticks[ticks.length - 1]).toBe(domain[1]);
    const gaps = ticks.slice(1).map((t, i) => t - ticks[i]!);
    expect(new Set(gaps).size).toBe(1);
  });
  it("handles a flat series and no data", () => {
    const flat = yScale([
      { t: 0, value: 70, valueWpm: 70, typedWpm: 70, acc: 96, pb: false, day: false, median: null, band: null, ref: null },
    ]);
    expect(flat.domain[0]).toBeLessThan(70);
    expect(flat.domain[1]).toBeGreaterThan(70);
    expect(yScale([]).domain).toEqual([0, 1]);
  });
  it("uses fine steps for small units", () => {
    const rows = trendRows(series(10), "all", NOW, "cps");
    const { ticks } = yScale(rows);
    expect(ticks.every((t) => Number.isFinite(t))).toBe(true);
    expect(ticks.length).toBeGreaterThanOrEqual(2);
  });
});

describe("table", () => {
  it("lists the newest 30 first", () => {
    const rows = trendRows(series(40), "all", NOW, "wpm");
    const table = tableRows(rows);
    expect(table).toHaveLength(30);
    expect(table[0]!.t).toBe(rows[39]!.t);
  });
  it("reports the bucket's best and first test", () => {
    expect(seriesFacts(series(10))).toEqual({ best: 74, firstMs: NOW - 10 * DAY });
  });
});
