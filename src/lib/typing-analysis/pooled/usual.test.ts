import { describe, expect, it } from "vitest";
import { seeded } from "../run-script-core";
import { quantile } from "../stats";
import { medianDiff, noise, passes, usualRange, zOf, type Unit } from "./usual";

const rng = (seed: number) => {
  const u = seeded(seed);
  return () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());
};

describe("usualRange", () => {
  it("is null under 5 values", () => expect(usualRange([1, 2, 3, 4])).toBeNull());
  it("is min to max for 5 to 9 values", () => {
    expect(usualRange([50, 60, 55, 52, 58])).toEqual({ low: 50, mid: 55, high: 60, n: 5, rule: "min-max" });
  });
  it("is Q10 to Q90 from 10 values", () => {
    const v = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    expect(usualRange(v)).toEqual({ low: quantile(v, 0.1), mid: 6.5, high: quantile(v, 0.9), n: 12, rule: "middle-80" });
  });
  it("min to max over 9 tests covers a new one about 80% of the time", () => {
    const n = rng(5);
    let inside = 0;
    for (let s = 0; s < 2000; s++) {
      const r = usualRange(Array.from({ length: 9 }, () => 70 + 3 * n()))!;
      const next = 70 + 3 * n();
      if (next >= r.low && next <= r.high) inside++;
    }
    expect(inside / 2000).toBeGreaterThan(0.75);
    expect(inside / 2000).toBeLessThan(0.85);
  });
});

describe("noise", () => {
  it("needs 15 values", () => expect(noise(Array(14).fill(1))).toBeNull());
  it("estimates SD 3 noise as 3 ± 0.6", () => {
    const n = rng(11);
    const v = Array.from({ length: 200 }, () => 70 + 3 * n());
    const r = noise(v)!;
    expect(r.sem).toBeGreaterThan(2.4);
    expect(r.sem).toBeLessThan(3.6);
    expect(r.mdc).toBeCloseTo(1.96 * Math.SQRT2 * r.sem, 9);
  });
  it("never compares a value with itself", () => {
    // One spike: if the window held the point itself, its residual would shrink.
    const v = [...Array(20).fill(10), 100, ...Array(9).fill(10)];
    expect(noise(v)!.sem).toBe(0);
  });
});

describe("medianDiff", () => {
  const units = (vs: number[], session: (i: number) => number, se?: number): Unit[] =>
    vs.map((v, i) => ({ v, session: session(i), ...(se !== undefined ? { se } : {}) }));

  it("d is the difference of medians", () => {
    const r = medianDiff(units([5, 6, 7], () => 0), units([1, 2, 3, 4, 5], (i) => i));
    expect(r.d).toBe(3);
  });
  it("a metric that is 0 in 80% of tests never gets se 0 (the jackknife floor)", () => {
    const vals = (k: number) => Array.from({ length: k }, (_, i) => (i % 5 === 0 ? 3 : 0));
    const R = units(vals(10), () => 0, 0).map((u) => (u.v > 0 ? { ...u, se: 1.5 } : u));
    const E = units(vals(30), (i) => Math.floor(i / 3), 0).map((u) => (u.v > 0 ? { ...u, se: 1.5 } : u));
    const r = medianDiff(R, E);
    expect(r.se).toBeGreaterThan(0);
    expect(r.se).toBeGreaterThanOrEqual(Math.sqrt(((1.5 ** 2 * 8) / 40) * (1 / 10 + 1 / 30)) - 1e-12);
  });
  it("is never 0 while values vary, even when every MAD is 0", () => {
    const R = units([0, 0, 0, 0, 0, 0, 0, 0, 0, 4], (i) => i % 2);
    const E = units([0, 0, 0, 0, 0, 0, 0, 0, 5, 0], (i) => i % 3);
    expect(medianDiff(R, E).se).toBeGreaterThan(0);
  });
  it("a session effect inflates se against the independent-test formula", () => {
    const n = rng(21);
    const make = (k: number, per: number, off: number) => {
      const out: Unit[] = [];
      for (let s = 0; s < k; s++) {
        const eff = 3 * n();
        for (let j = 0; j < per; j++) out.push({ v: 70 + eff + 2 * n(), session: off + s });
      }
      return out;
    };
    const R = make(2, 5, 0);
    const E = make(6, 5, 10);
    const clustered = medianDiff(R, E).se;
    const independent = medianDiff(R.map((u, i) => ({ ...u, session: i })), E.map((u, i) => ({ ...u, session: 100 + i }))).se;
    expect(clustered).toBeGreaterThan(independent);
  });
  it("with one test per session it matches the test formula within 10%", () => {
    const n = rng(31);
    const R = Array.from({ length: 10 }, (_, i) => ({ v: 70 + 3 * n(), session: i }));
    const E = Array.from({ length: 30 }, (_, i) => ({ v: 70 + 3 * n(), session: 100 + i }));
    const sd = (us: Unit[]) => {
      const m = us.reduce((s, u) => s + u.v, 0) / us.length;
      return us.reduce((s, u) => s + (u.v - m) ** 2, 0) / (us.length - 1);
    };
    const pooled = Math.sqrt(((R.length - 1) * sd(R) + (E.length - 1) * sd(E)) / (R.length + E.length - 2));
    const formula = Math.sqrt((Math.PI / 2) * pooled ** 2 * (1 / 10 + 1 / 30));
    // The between term never drops below the spec's 0.5·σ_w fallback, which
    // adds (0.25 / (π/2)) of the variance, about 8% of the SE.
    expect(Math.abs(medianDiff(R, E).se / formula - 1)).toBeLessThan(0.1);
  });
  it("is calibrated on independent normal tests (about 1.2% pass z 2.5)", () => {
    const n = rng(41);
    let beyond = 0;
    for (let s = 0; s < 1000; s++) {
      const R = Array.from({ length: 10 }, (_, i) => ({ v: 3 * n(), session: Math.floor(i / 3) }));
      const E = Array.from({ length: 30 }, (_, i) => ({ v: 3 * n(), session: 10 + Math.floor(i / 3) }));
      if (passes(medianDiff(R, E), 2.5)) beyond++;
    }
    expect(beyond / 1000).toBeLessThan(0.03);
  });
  it("df is the number of sessions less 2", () => {
    const R = [0, 1, 2].map((i) => ({ v: i, session: i }));
    const E = [3, 4, 5, 6].map((i) => ({ v: i, session: 10 + (i % 2) }));
    expect(medianDiff(R, E).df).toBe(3);
  });
  it("zOf is 0 without spread", () => {
    expect(zOf({ d: 3, se: 0, df: 10 })).toBe(0);
    expect(medianDiff([], [{ v: 1, session: 0 }])).toEqual({ d: 0, se: 0, df: 0 });
  });
  it("judges d/se as a t with the sessions' df", () => {
    // t = 3 at 4 df is p ≈ 0.04: below a normal z of 2.5, above 2.
    const few = { d: 3, se: 1, df: 4 };
    expect(passes(few, 2.5)).toBe(false);
    expect(passes(few, 2)).toBe(true);
    expect(Math.abs(zOf(few))).toBeGreaterThan(2);
    expect(Math.abs(zOf(few))).toBeLessThan(2.5);
    // With many sessions, t is the normal z.
    expect(zOf({ d: -2.5, se: 1, df: 1e6 })).toBeCloseTo(-2.5, 3);
    expect(passes({ d: 2.6, se: 1, df: 1e6 }, 2.5)).toBe(true);
  });
});
