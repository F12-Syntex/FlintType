import { describe, expect, it } from "vitest";
import type { FrictionKey, TestDigestV1 } from "@/types/typing-analysis";
import { barriersOf, beforeDetail, dispersion, fixingDetail, insideDetail } from "./barriers";
import { buildPooled, type FixtureOptions } from "./digest-fixtures";
import { betterDays, kelleyQ25 } from "./minute";
import { dg, fixKeyOf, windowsFor, type PooledTest } from "./windows";

const READY = { weaknessReady: true, worstWordsReady: true };
const w = (ts: PooledTest[]) => windowsFor(ts, ts[0]!.bucket);
const IDX: Record<FrictionKey, number> = { fixing: 1, before: 2, inside: 3 };

/** Digests with exact seconds a minute per slice (no stored se, so the
 *  better days are a plain Q25). `per(i)` gets the index, newest first. */
function exact(per: (i: number) => Partial<Record<FrictionKey, number>>, n = 40, o: FixtureOptions = {}): PooledTest[] {
  return buildPooled({ tests: n, seed: 4, ...o }).map((t, i) => {
    const d = dg(t);
    const sl = [...d.sl] as TestDigestV1["sl"];
    const want = { fixing: 0, before: 0, inside: 0, ...per(i) };
    for (const k of ["fixing", "before", "inside"] as const) sl[IDX[k]] = Math.round((want[k] * d.ms) / 60);
    sl[4] = 0;
    sl[0] = d.ms - sl[1] - sl[2] - sl[3];
    return { ...t, digest: { ...d, sl, se: null } };
  });
}
function run(ts: PooledTest[], W = 72) {
  const win = w(ts);
  const fixKey = fixKeyOf(win);
  return barriersOf(win, { fixKey, better: betterDays(win, fixKey), fixingSuppressed: false, W, readiness: READY });
}

describe("barriersOf", () => {
  it("is learning below 5 recent and 10 usual digests", () => {
    expect(run(exact(() => ({}), 8)).section).toEqual({ status: "learning", gate: { have: 8, need: 10, unit: "tests" } });
  });
  it("R is 0 when now is at or below the better days", () => {
    expect(run(exact(() => ({ before: 5 }))).section).toEqual({ status: "ready", items: [] });
  });
  it("shows a slice once its lower bound is 0.5 s a minute over the better days", () => {
    expect(run(exact((i) => ({ before: i < 10 ? 4.4 : 4 }))).section).toMatchObject({ items: [] });
    const r = run(exact((i) => ({ before: i < 10 ? 4.6 : 4 })));
    expect(r.section).toMatchObject({ status: "ready", items: [{ kind: "before", recent: 4.6, better: 4, recoverable: { low: 0.6, high: 0.6 } }] });
  });
  it("gain: 72 wpm with 4 s a minute to win back is about 5 wpm", () => {
    const r = run(exact((i) => ({ inside: i < 10 ? 8 : 4 })), 72);
    if (r.section.status !== "ready") throw new Error("not ready");
    expect(r.section.items[0]).toMatchObject({ kind: "inside", gain: { low: 5, high: 5 } });
  });
  it("lowering a recent value never raises what you could win back", () => {
    const base = exact((i) => ({ before: i < 10 ? 3 + (i % 5) : 2 + (i % 3) }));
    const lo = (ts: PooledTest[]) => {
      const s = run(ts).section;
      return s.status === "ready" ? (s.items.find((b) => b.kind === "before")?.recoverable.low ?? 0) : 0;
    };
    const before = lo(base);
    for (let k = 0; k < 10; k++) {
      const lower = base.map((t, i) => (i === k ? { ...t, digest: { ...dg(t), sl: [dg(t).sl[0] + dg(t).sl[2], dg(t).sl[1], 0, dg(t).sl[3], 0] as TestDigestV1["sl"] } } : t));
      expect(lo(lower)).toBeLessThanOrEqual(before);
    }
  });
  it("ranks by the lower bound, ties going to fixing, then before, then inside", () => {
    const r = run(exact((i) => (i < 10 ? { fixing: 5, before: 5, inside: 7 } : { fixing: 2, before: 2, inside: 2 })));
    if (r.section.status !== "ready") throw new Error("not ready");
    expect(r.section.items.map((b) => b.kind)).toEqual(["inside", "fixing", "before"]);
  });
  it("what-if adds the shown slices: W·60 / (60 − ΣR)", () => {
    const r = run(exact((i) => (i < 10 ? { fixing: 4, before: 6 } : { fixing: 1, before: 1 })), 60);
    expect(r.whatIf).toEqual({ low: Math.round((60 * 60) / (60 - 8)), high: Math.round((60 * 60) / (60 - 8)) });
    expect(run(exact((i) => ({ before: i < 10 ? 1.1 : 0.5 })), 30).whatIf).toBeNull();
  });
  it("never offers a locked drill", () => {
    const r = barriersOf(w(exact((i) => ({ inside: i < 10 ? 6 : 1 }))), {
      fixKey: "fix", better: betterDays(w(exact((i) => ({ inside: i < 10 ? 6 : 1 }))), "fix"), fixingSuppressed: false, W: 70,
      readiness: { weaknessReady: false, worstWordsReady: false },
    });
    if (r.section.status !== "ready") throw new Error("not ready");
    expect(r.section.items[0]!.action).toEqual({ kind: "drill", drillId: "trigram-burst" });
  });
  it("with backspace off, fixing shows only as more frequent mistakes, never as a cost per fix", () => {
    const none: FixtureOptions = { fixMode: "none" };
    const steady = run(exact((i) => (i < 10 ? { fixing: 9 } : { fixing: 1 }), 40, none));
    expect(steady.section).toEqual({ status: "ready", items: [] });
    expect(fixingDetail(w(buildPooled({ tests: 40, seed: 2, ...none })), "none")).toBeNull();
    const more = { ...none, mistakesPerMin: 3, recent: { mistakesPerMin: 9 } };
    const r = run(exact((i) => (i < 10 ? { fixing: 9 } : { fixing: 1 }), 40, more));
    if (r.section.status !== "ready") throw new Error("not ready");
    expect(r.section.items.map((b) => [b.kind, b.variant])).toEqual([["fixing", "frequency"]]);
    expect(r.section.items[0]!.detail.perMin).toHaveLength(2);
  });
  it("skips fixing when the newest fix mode has too few recent tests", () => {
    const ts = exact((i) => (i < 10 ? { fixing: 9 } : { fixing: 1 }));
    const win = w(ts);
    const r = barriersOf(win, { fixKey: "fix", better: betterDays(win, "fix"), fixingSuppressed: true, W: 70, readiness: READY });
    expect(r.section).toEqual({ status: "ready", items: [] });
  });
});

describe("variants", () => {
  const shareFrequency = (o: FixtureOptions, seeds: number) => {
    let k = 0;
    for (let s = 1; s <= seeds; s++) if (fixingDetail(w(buildPooled({ ...o, seed: s })), "fix")?.variant === "frequency") k++;
    return k / seeds;
  };
  // The fixture's mistake rate has session and day effects, so counts vary
  // more than Poisson; a plain Poisson test fired for 6–13% of these
  // stationary users. Measured over 400 seeds: stationary 3–4%, a doubled
  // rate in 60 s tests 50%, a tripled rate 70%.
  it("frequency: a stationary typist with about a mistake a test rarely fires, a raised rate does", () => {
    expect(shareFrequency({ tests: 40, mistakesPerMin: 2.5 }, 200)).toBeLessThanOrEqual(0.05);
    expect(shareFrequency({ tests: 40, mistakesPerMin: 6 }, 200)).toBeLessThanOrEqual(0.05);
    expect(shareFrequency({ tests: 40, mistakesPerMin: 4, lengthMode: "time", length: 60, recent: { mistakesPerMin: 4 } }, 100))
      .toBeGreaterThanOrEqual(0.4);
    expect(shareFrequency({ tests: 40, mistakesPerMin: 3, recent: { mistakesPerMin: 6 } }, 100)).toBeGreaterThanOrEqual(0.6);
    const d = fixingDetail(w(buildPooled({ tests: 40, mistakesPerMin: 3, recent: { mistakesPerMin: 9 }, seed: 3 })), "fix")!;
    expect(d.variant).toBe("frequency");
    expect(d.detail.perMin![0]).toBeGreaterThan(2 * d.detail.perMin![1]);
  });
  it("dispersion: per session, never below 1, with sessions − 1 degrees of freedom", () => {
    const ts = buildPooled({ tests: 40, seed: 6 });
    const sessions = new Set(ts.map((t) => t.session)).size;
    const even = ts.map((t) => ({ ...t, digest: { ...dg(t), ms: 60_000, err: { ...dg(t).err, n: 2 } } }));
    expect(dispersion(even, 2)).toEqual({ phi: 1, df: sessions - 1 });
    const lumpy = even.map((t) => ({ ...t, digest: { ...dg(t), err: { ...dg(t).err, n: t.session % 2 ? 0 : 6 } } }));
    expect(dispersion(lumpy, 3).phi).toBeGreaterThan(3);
    expect(dispersion(even.slice(0, 1), 2)).toEqual({ phi: 1, df: 1 });
    expect(dispersion(even, 0).phi).toBe(1);
  });
  it("cost: keys' worth of time per mistake, recently and usually", () => {
    const d = fixingDetail(w(buildPooled({ tests: 40, seed: 2 })), "fix")!;
    expect(d.variant).toBe("cost");
    expect(d.detail.costKeys![0]).toBeGreaterThan(0);
  });
  it("before: longer words, and a Kelley-shrunk better-days share", () => {
    const long = beforeDetail(w(buildPooled({ tests: 40, longWordPause: 4, slices: { before: 8 }, zeroShare: { before: 0 } })));
    expect(long.variant).toBe("longWords");
    const win = w(buildPooled({ tests: 40, seed: 3 }));
    const flat = beforeDetail(win);
    expect(flat.variant).toBe("flat");
    const shares = win.usualD.filter((t) => dg(t).n.bd > 0).map((t) => dg(t).n.pa / dg(t).n.bd);
    const ses = win.usualD.filter((t) => dg(t).n.bd > 0).map((t) => {
      const n = dg(t).n.bd;
      const p = Math.min(1 - 0.5 / n, Math.max(0.5 / n, dg(t).n.pa / n));
      return Math.sqrt((p * (1 - p)) / n);
    });
    expect(flat.detail.pauseOneIn![1]).toBeCloseTo(Math.max(0, kelleyQ25(shares, ses)), 3);
  });
  it("pair: a rarely typed pair with a high catch rate beats a frequent pair with a normal one", () => {
    const ts = buildPooled({ tests: 40, seed: 5 }).map((t, i) => {
      if (i >= 10) return t;
      const d = dg(t);
      const pairs: TestDigestV1["pairs"] = [["th", 20, 20 * 5, 20 * 25.1], ["xq", 2, 10, 50.1]];
      return { ...t, digest: { ...d, n: { ...d.n, in: 100, ca: 2 }, ip: [["th", 1], ["xq", 1]] as TestDigestV1["ip"], pairs } };
    });
    expect(insideDetail(w(ts))).toEqual({ variant: "pair", detail: { pair: "xq" } });
    expect(insideDetail(w(buildPooled({ tests: 40, seed: 5 }))).variant).toBe("flat");
  });
});
