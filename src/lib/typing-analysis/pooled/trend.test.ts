import { describe, expect, it } from "vitest";
import { buildPooled, type FixtureOptions } from "./digest-fixtures";
import { difficultyAdjustment, type Adjustment } from "./difficulty";
import { trendOf, trendSeries, wpmWorth, type FrictionMove } from "./trend";
import { windowsFor, type PooledTest } from "./windows";

const w = (ts: PooledTest[]) => windowsFor(ts, ts[0]!.bucket);
function trend(o: FixtureOptions, friction: FrictionMove[] = [], W = 70) {
  const win = w(buildPooled(o));
  return trendOf(win, difficultyAdjustment(win), { plateau: null, friction, W });
}

describe("trendOf", () => {
  it("+6 wpm with SD 2 is improving; −6 is slipping", () => {
    const up = trend({ tests: 40, noiseSd: 2, seed: 2, recent: { wpm: 6 } });
    expect(up.state).toBe("improving");
    expect(up.deltaWpm).toBeGreaterThanOrEqual(4);
    expect(up.deltaWpm).toBeLessThanOrEqual(8);
    expect(trend({ tests: 40, noiseSd: 2, seed: 2, recent: { wpm: -6 } })).toMatchObject({ state: "slipping" });
  });
  it("I12: stationary noise is steady for at least 90% of 200 users", () => {
    let steady = 0;
    for (let s = 1; s <= 200; s++) if (trend({ tests: 40, seed: s }).state === "steady") steady++;
    expect(steady / 200).toBeGreaterThanOrEqual(0.9);
  });
  it("is early below 15 tests, and early with a sessions gate when the recent tests are one sitting", () => {
    expect(trend({ tests: 12 })).toMatchObject({ state: "early", gate: { have: 12, need: 15, unit: "tests" } });
    const one = trend({ tests: 40, sessions: [...Array(30).fill(1), 10] });
    expect(one).toMatchObject({ state: "early", gate: { have: 1, need: 2, unit: "sessions" } });
  });
  it("reports how far back the earlier tests reach and how many there are", () => {
    const win = w(buildPooled({ tests: 40 }));
    const t = trendOf(win, difficultyAdjustment(win), { plateau: null, friction: [], W: 70 });
    expect(t.earlierN).toBe(30);
    expect(t.sinceMs).toBe(win.earlier[14]!.startedAtMs);
  });
  it("is levelled when steady and the plateau test passes", () => {
    const win = w(buildPooled({ tests: 40, seed: 1 }));
    const t = trendOf(win, difficultyAdjustment(win), { plateau: { weeks: 3 }, friction: [], W: 70 });
    expect(t).toMatchObject({ state: "levelled", weeks: 3 });
  });
  it("uses the adjusted values when the bucket is adjusted", () => {
    const ts = buildPooled({ tests: 40, noiseSd: 2, mode: "training", diff: 1, seed: 2 });
    const win = w(ts);
    const raw = difficultyAdjustment(win);
    // The same raw speeds, but recent passages much harder: adjusted, they are faster.
    const recent = new Set(win.recent.map((t) => t.id));
    const harder: Adjustment = { ...raw, values: new Map([...raw.values].map(([id, v]) => [id, recent.has(id) ? v * 1.12 : v])) };
    expect(trendOf(win, harder, { plateau: null, friction: [], W: 70 }).state).toBe("improving");
  });
  it("explains a change only with a friction move worth half of it", () => {
    const moves: FrictionMove[] = [
      { kind: "before", direction: "better", before: 6, after: 3 }, // worth 70·(60/57 − 1) ≈ 3.7 wpm
      { kind: "inside", direction: "better", before: 2, after: 1.5 },
    ];
    expect(trend({ tests: 40, noiseSd: 2, seed: 2, recent: { wpm: 6 } }, moves).explanation).toBe("before");
    expect(trend({ tests: 40, noiseSd: 2, seed: 2, recent: { wpm: 6 } }, [moves[1]!]).explanation).toBeNull();
    expect(trend({ tests: 40, noiseSd: 2, seed: 2, recent: { wpm: -6 } }, moves).explanation).toBeNull();
    expect(wpmWorth(72, 4)).toBeCloseTo(72 * (60 / 56 - 1), 12);
  });
});

describe("trendSeries", () => {
  it("is null below 2 tests and runs oldest to newest", () => {
    const one = w(buildPooled({ tests: 1 }));
    expect(trendSeries(one.tests, difficultyAdjustment(one))).toBeNull();
    const win = w(buildPooled({ tests: 30 }));
    const s = trendSeries(win.tests, difficultyAdjustment(win))!;
    expect(s.points).toHaveLength(30);
    expect(s.points[0]!.t).toBeLessThan(s.points[29]!.t);
    expect(s.median).toHaveLength(28);
    expect(s.band).toHaveLength(23);
    expect(s.points[0]!.pb).toBe(false);
  });
  it("charts pooled tests at their scaled speed, the typed one beside it, and marks no best", () => {
    const win = w(buildPooled({ tests: 12 }));
    const pooled = win.tests.map((t) => ({ ...t, wpm: t.wpm * 1.2, accuracy: 90, typed: { wpm: t.wpm, accuracy: t.accuracy } }));
    const s = trendSeries(pooled, difficultyAdjustment({ ...win, tests: pooled, usual: pooled.slice(0, 30) }))!;
    expect(s.scaled).toBe(true);
    expect(s.adjusted).toBe(false);
    expect(s.points.every((p) => !p.pb)).toBe(true);
    const newest = s.points[s.points.length - 1]!;
    expect(newest.wpm).toBe(win.tests[0]!.wpm);
    expect(newest.value).toBeCloseTo(win.tests[0]!.wpm * 1.2);
    expect(newest.acc).toBe(win.tests[0]!.accuracy);
    expect(trendSeries(win.tests, difficultyAdjustment(win))!.scaled).toBe(false);
  });
  it("marks a test faster than every earlier one as a personal best", () => {
    const win = w(buildPooled({ tests: 30 }));
    const s = trendSeries(win.tests, difficultyAdjustment(win))!;
    let best = -Infinity;
    s.points.forEach((p, i) => {
      expect(p.pb).toBe(i > 0 && p.wpm > best);
      best = Math.max(best, p.wpm);
    });
  });
  it("past 150 tests, downsamples to daily medians and keeps personal bests", () => {
    const win = w(buildPooled({ tests: 400, drift: 0.2 }));
    const full = trendSeries(win.tests.slice(0, 150), difficultyAdjustment(win))!;
    expect(full.points).toHaveLength(150);
    const s = trendSeries(win.tests, difficultyAdjustment(win))!;
    expect(s.points.length).toBeLessThan(400);
    const pbs = win.tests.slice(0, 500).filter((t, i, all) => i < all.length - 1 && all.slice(i + 1).every((o) => t.wpm > o.wpm));
    expect(s.points.filter((p) => p.pb)).toHaveLength(pbs.length);
    expect(s.points.every((p, i) => i === 0 || p.t >= s.points[i - 1]!.t)).toBe(true);
  });
  it("a personal best mid-day never splits that day's median", () => {
    const win = w(buildPooled({ tests: 400, drift: 0.2, perDay: [3, 3], sessions: Array(200).fill(2), seed: 3 }));
    const s = trendSeries(win.tests, difficultyAdjustment(win))!;
    const dayOf = (t: number) => Math.floor(t / 86_400_000);
    const pbAt = new Set(s.points.filter((p) => p.pb).map((p) => p.t));
    // Every test that isn't a kept personal best, grouped by UTC day.
    const days = new Map<number, number[]>();
    for (const t of win.tests) {
      if (pbAt.has(t.startedAtMs)) continue;
      days.set(dayOf(t.startedAtMs), [...(days.get(dayOf(t.startedAtMs)) ?? []), t.wpm]);
    }
    const medians = s.points.filter((p) => !p.pb);
    expect(pbAt.size).toBeGreaterThan(5);
    expect(new Set(medians.map((p) => dayOf(p.t))).size).toBe(medians.length);
    expect(medians).toHaveLength(days.size);
    for (const p of medians) {
      const wpms = days.get(dayOf(p.t))!.sort((a, b) => a - b);
      const k = wpms.length;
      expect(p.wpm).toBeCloseTo(k % 2 ? wpms[(k - 1) / 2]! : (wpms[k / 2 - 1]! + wpms[k / 2]!) / 2, 9);
    }
    expect(s.points.every((p, i) => i === 0 || p.t >= s.points[i - 1]!.t)).toBe(true);
    expect(s.median.map((m) => dayOf(m.t))).toEqual([...new Set(s.median.map((m) => dayOf(m.t)))]);
  });
  it("caps the series at the newest 500 tests", () => {
    const win = w(buildPooled({ tests: 520, perDay: [1, 1], sessions: Array(600).fill(1) }));
    const s = trendSeries(win.tests, difficultyAdjustment(win))!;
    expect(s.points[0]!.t).toBeGreaterThanOrEqual(win.tests[499]!.startedAtMs);
  });
});
