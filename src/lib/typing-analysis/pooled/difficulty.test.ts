import { describe, expect, it } from "vitest";
import { seeded } from "../run-script-core";
import { buildPooled } from "./digest-fixtures";
import { adjFactor, B_DEFAULT, difficultyAdjustment, inWordShare, valueOf } from "./difficulty";
import { windowsFor, type PooledTest } from "./windows";

const training = (o: Parameters<typeof buildPooled>[0] = {}) => buildPooled({ mode: "training", diff: 1, ...o });
const w = (ts: PooledTest[]) => windowsFor(ts, ts[0]!.bucket);

describe("adjFactor", () => {
  it("is 1 at the bucket median", () => expect(adjFactor(1.07, 1.07, 0.6)).toBe(1));
  it("a passage 20% harder in its in-word moves gets 1.12 with b = 0.6", () => {
    expect(adjFactor(1.2, 1, 0.6)).toBeCloseTo(1.12, 10);
  });
  it("clamps to [0.8, 1.25]", () => {
    expect(adjFactor(3, 1, 0.6)).toBe(1.25);
    expect(adjFactor(0.1, 1, 0.6)).toBe(0.8);
  });
});

describe("inWordShare", () => {
  it("is the median iw of the usual digests, clamped, and 0.6 without any", () => {
    const ts = training({ iw: 0.7, tests: 12 });
    expect(inWordShare(ts)).toBeGreaterThan(0.65);
    expect(inWordShare(ts.map((t) => ({ ...t, digest: { ...t.digest!, iw: null } })))).toBe(B_DEFAULT);
    expect(inWordShare(training({ iw: 0.99, tests: 12 }))).toBe(0.9);
  });
});

describe("difficultyAdjustment", () => {
  it("adjusts an Adapt bucket whose usual window all has diff", () => {
    const a = difficultyAdjustment(w(training()));
    expect(a.adjusted).toBe(true);
    expect(a.dTilde).not.toBeNull();
    const t = w(training()).tests[0]!;
    expect(valueOf(a, t)).toBeCloseTo(t.wpm * adjFactor(t.diff!, a.dTilde!, a.b), 9);
  });
  it("never adjusts a casual bucket", () => {
    expect(difficultyAdjustment(w(buildPooled({ diff: 1 }))).adjusted).toBe(false);
  });
  it("needs 80% of the usual window to have diff (70% is not enough)", () => {
    const ts = training();
    const usualIds = new Set(w(ts).usual.map((t) => t.id));
    let dropped = 0;
    const thin = ts.map((t) => (usualIds.has(t.id) && dropped++ < 9 ? { ...t, diff: null } : t));
    expect(difficultyAdjustment(w(thin)).adjusted).toBe(false);
    const raw = difficultyAdjustment(w(thin));
    expect(valueOf(raw, thin[0]!)).toBe(thin[0]!.wpm);
  });
  it("adjusts tests beyond the 40 loaded digests through the index diff", () => {
    const ts = training({ tests: 60 }).map((t, i) => (i >= 40 ? { ...t, digest: null } : t));
    const a = difficultyAdjustment(w(ts));
    const old = ts[55]!;
    expect(a.adjusted).toBe(true);
    expect(valueOf(a, old)).not.toBe(old.wpm);
  });
  it("uses no fitted slope: harder passages on faster days don't change adj", () => {
    // Two users with the same passages; one types faster on the harder ones.
    const base = training({ tests: 40, seed: 9 });
    const u = seeded(4);
    const shuffled = base.map((t) => ({ ...t, wpm: 60 + 20 * u() }));
    const confounded = base.map((t) => ({ ...t, wpm: 60 + 40 * ((t.diff ?? 1) - 0.9) }));
    const a1 = difficultyAdjustment(w(shuffled));
    const a2 = difficultyAdjustment(w(confounded));
    for (let i = 0; i < 10; i++) {
      const f1 = valueOf(a1, shuffled[i]!) / shuffled[i]!.wpm;
      const f2 = valueOf(a2, confounded[i]!) / confounded[i]!.wpm;
      expect(f1).toBeCloseTo(f2, 12);
    }
  });
});
