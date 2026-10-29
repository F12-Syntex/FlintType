import { describe, expect, it } from "vitest";
import { parseDigest } from "../digest";
import { dispersion } from "./barriers";
import { arDays, buildPooled, fixtureData, FIXTURE_T0, gen, mergeFixtures, nowAfter } from "./digest-fixtures";
import { sPerMin } from "./minute";
import { dg } from "./windows";

describe("digest fixtures", () => {
  it("are deterministic per seed and differ across seeds", () => {
    expect(fixtureData({ seed: 3 })).toEqual(fixtureData({ seed: 3 }));
    expect(fixtureData({ seed: 3 }).rows[0]!.wpm).not.toBe(fixtureData({ seed: 4 }).rows[0]!.wpm);
  });
  it("every digest passes parseDigest and its slices sum to the test's length", () => {
    const f = fixtureData({ tests: 200, mode: "training", diff: 1, lengthMode: "time", length: 60 });
    for (const d of f.digests.values()) {
      expect(parseDigest(JSON.parse(JSON.stringify(d)))).not.toBeNull();
      expect(d.sl.reduce((a, b) => a + b, 0)).toBe(d.ms);
      expect(d.sl.every((x) => x >= 0)).toBe(true);
    }
  });
  it("rows come newest first, with the index carrying bucket and diff", () => {
    const f = fixtureData({ tests: 30, diff: 1.1, touch: true });
    const t = f.rows.map((r) => r.startedAt.getTime());
    expect(t.every((x, i) => i === 0 || x <= t[i - 1]!)).toBe(true);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(FIXTURE_T0);
    expect(f.index.get(f.rows[0]!.id)).toMatchObject({ bucket: "casual|words|25|t" });
    expect(f.index.get(f.rows[0]!.id)!.diff).toBeGreaterThan(0.8);
    expect(f.digests.get(f.rows[0]!.id)!.ctx.input).toBe("touch");
  });
  it("friction is zero-inflated like a real typist's", () => {
    const ts = buildPooled({ tests: 400, seed: 2 });
    const zero = (x: "fixing" | "before" | "inside") => ts.filter((t) => sPerMin(dg(t), x) === 0).length / ts.length;
    expect(zero("fixing")).toBeGreaterThan(0.25);
    expect(zero("fixing")).toBeLessThan(0.45);
    expect(zero("before")).toBeGreaterThan(0.3);
    expect(zero("before")).toBeLessThan(0.5);
    expect(zero("inside")).toBeGreaterThan(0.4);
    expect(zero("inside")).toBeLessThan(0.6);
    expect(ts.every((t) => dg(t).se !== null)).toBe(true);
  });
  it("day effects are AR(1) with the given SD and φ", () => {
    const at = arDays(gen(11), 0.5, 0.3);
    const xs = Array.from({ length: 20_000 }, (_, d) => at(d));
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const v = xs.reduce((a, x) => a + (x - mean) ** 2, 0) / xs.length;
    const lag = xs.slice(1).reduce((a, x, i) => a + (x - mean) * (xs[i]! - mean), 0) / (xs.length - 1);
    expect(Math.sqrt(v)).toBeCloseTo(0.3, 1);
    expect(lag / v).toBeGreaterThan(0.45);
    expect(lag / v).toBeLessThan(0.55);
    expect(at(5)).toBe(xs[5]);
  });
  it("mistake counts vary more than Poisson from session to session", () => {
    const ts = buildPooled({ tests: 600, seed: 7, lengthMode: "time", length: 60, mistakesPerMin: 8 });
    const rate = ts.reduce((s, t) => s + dg(t).err.n, 0) / ts.reduce((s, t) => s + dg(t).ms / 60000, 0);
    expect(dispersion(ts, rate).phi).toBeGreaterThan(3);
  });
  it("with backspace off nothing is fixed, so a digest has no cost, latency or notice figure", () => {
    const none = [...fixtureData({ tests: 40, fixMode: "none", seed: 2 }).digests.values()];
    expect(none.some((d) => d.err.n > 0)).toBe(true);
    expect(none.every((d) => d.err.fixed === 0 && d.err.med === null && d.err.lat === null && d.err.nk === null)).toBe(true);
    const fix = [...fixtureData({ tests: 40, seed: 2 }).digests.values()].filter((d) => d.err.fixed > 0);
    expect(fix.length).toBeGreaterThan(0);
    expect(fix.every((d) => d.err.med !== null)).toBe(true);
  });
  it("tests come in sessions of 1 to 6, 1 to 3 sessions a day", () => {
    const ts = buildPooled({ tests: 300, seed: 5 });
    const sizes = new Map<number, number>();
    for (const t of ts) sizes.set(t.session, (sizes.get(t.session) ?? 0) + 1);
    expect(Math.max(...sizes.values())).toBeLessThanOrEqual(6);
    const days = new Map<number, Set<number>>();
    for (const t of ts) {
      const day = Math.floor((t.startedAtMs - FIXTURE_T0) / 86_400_000);
      days.set(day, (days.get(day) ?? new Set()).add(t.session));
    }
    expect(Math.max(...[...days.values()].map((s) => s.size))).toBeLessThanOrEqual(3);
  });
  it("shifts only the newest tests", () => {
    const base = buildPooled({ tests: 40, seed: 1 });
    const up = buildPooled({ tests: 40, seed: 1, recent: { wpm: 10 } });
    expect(up[0]!.wpm - base[0]!.wpm).toBeCloseTo(10, 0);
    expect(up[20]!.wpm).toBeCloseTo(base[20]!.wpm, 9);
  });
  it("merges two users' worth of buckets and gives a natural now", () => {
    const m = mergeFixtures([fixtureData({ tests: 3 }), fixtureData({ tests: 2, length: 50, idPrefix: "b" })]);
    expect(m.rows).toHaveLength(5);
    expect(new Set([...m.index.values()].map((x) => x.bucket))).toEqual(new Set(["casual|words|25", "casual|words|50"]));
    expect(nowAfter([{ startedAtMs: 5 }])).toBe(60_005);
  });
});
