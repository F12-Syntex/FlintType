import { describe, expect, it } from "vitest";
import {
  ALPHA_CAP,
  ALPHA_FLOOR,
  CONFIDENCE_SATURATION,
  EWMA_MEMORY,
  SHIFT_MIN_BATCH,
  SHIFT_MIN_PRIOR,
  SHIFT_RESET_N,
  STALENESS_HALF_LIFE_DAYS,
  type ModelState,
  confidence,
  detectShift,
  learningRate,
  seed,
  staleDays,
  stalenessFactor,
  update,
  updateMany,
} from "./welford";

describe("welford", () => {
  it("learningRate clamps within [ALPHA_FLOOR, ALPHA_CAP]", () => {
    expect(learningRate(0)).toBe(ALPHA_CAP);
    expect(learningRate(1)).toBe(ALPHA_CAP);
    expect(learningRate(50)).toBe(ALPHA_FLOOR);
    expect(learningRate(10_000)).toBe(ALPHA_FLOOR);
  });

  it("seed initialises from the first sample", () => {
    expect(seed(120)).toEqual({ mean: 120, variance: 0, n: 1 });
  });

  it("update tracks the mean toward a new value with a small alpha at high n", () => {
    let s = seed(100);
    // Push n into the floor-rate regime so each sample only nudges by
    // ALPHA_FLOOR of the gap.
    for (let i = 0; i < 100; i++) s = update(s, 100);
    expect(s.mean).toBeCloseTo(100, 5);
    expect(s.n).toBe(101);
    s = update(s, 200);
    expect(s.mean).toBeCloseTo(100 + 100 * ALPHA_FLOOR, 5);
  });

  it("update tracks the mean aggressively in the cap regime", () => {
    let s = seed(100);
    s = update(s, 200); // alpha = 0.5 → mean = 150
    expect(s.mean).toBeCloseTo(150, 5);
  });

  it("variance grows when samples disagree with the mean", () => {
    let s = seed(100);
    s = update(s, 200);
    s = update(s, 50);
    s = update(s, 250);
    expect(s.variance).toBeGreaterThan(0);
  });

  it("variance stays at 0 when every sample equals the seed", () => {
    let s = seed(100);
    for (let i = 0; i < 20; i++) s = update(s, 100);
    expect(s.variance).toBeCloseTo(0, 5);
  });

  it("variance never goes negative even with extreme inputs", () => {
    let s = seed(100);
    for (let i = 0; i < 50; i++) s = update(s, i % 2 === 0 ? 1 : 1_000_000);
    expect(s.variance).toBeGreaterThanOrEqual(0);
  });

  it("updateMany seeds from the first sample when state is null", () => {
    const s = updateMany(null, [100, 110, 90, 105]);
    expect(s).not.toBeNull();
    expect(s!.n).toBe(4);
  });

  it("updateMany leaves a null state alone for an empty input", () => {
    expect(updateMany(null, [])).toBeNull();
  });

  it("updateMany continues from an existing state", () => {
    const before = updateMany(null, [100, 100, 100]);
    const after = updateMany(before, [100, 100]);
    expect(after!.n).toBe(5);
    expect(after!.mean).toBeCloseTo(100, 5);
  });

  it("confidence is 0 with no samples and 1 once saturated", () => {
    expect(confidence(0)).toBe(0);
    expect(confidence(CONFIDENCE_SATURATION)).toBe(1);
    expect(confidence(CONFIDENCE_SATURATION * 10)).toBe(1);
    expect(confidence(CONFIDENCE_SATURATION / 2)).toBeCloseTo(0.5, 5);
  });
});

describe("welford — staleness", () => {
  const DAY = 86_400_000;

  it("staleDays measures days since last seen, clamped at 0", () => {
    expect(staleDays(0, 3 * DAY)).toBeCloseTo(3, 5);
    expect(staleDays(5 * DAY, 3 * DAY)).toBe(0); // clock skew
    expect(staleDays(undefined, 3 * DAY)).toBe(0);
    expect(staleDays(0, undefined)).toBe(0);
  });

  it("stalenessFactor halves weight every half-life", () => {
    expect(stalenessFactor(0)).toBe(1);
    expect(stalenessFactor(STALENESS_HALF_LIFE_DAYS)).toBeCloseTo(0.5, 5);
    expect(stalenessFactor(2 * STALENESS_HALF_LIFE_DAYS)).toBeCloseTo(0.25, 5);
  });

  it("a long-unseen pattern re-learns faster from new samples", () => {
    const old: ModelState = { mean: 200, variance: 0, n: 40 };
    const fresh = updateMany(old, [120])!;
    const stale = updateMany(old, [120], {
      staleDays: 4 * STALENESS_HALF_LIFE_DAYS,
    })!;
    expect(stale.mean).toBeLessThan(fresh.mean);
    // Stored count still advances by the real number of samples.
    expect(stale.n).toBe(41);
  });

  it("EWMA_MEMORY matches the floor rate's effective sample size", () => {
    expect(EWMA_MEMORY).toBeCloseTo((2 - ALPHA_FLOOR) / ALPHA_FLOOR, 5);
  });

  it("learningRate accepts fractional (decayed) counts", () => {
    expect(learningRate(1.5)).toBeCloseTo(1 / 2.5, 5);
  });
});

describe("welford — shift detection", () => {
  // Established pattern: 200ms ± 30ms over plenty of samples.
  const settled: ModelState = { mean: 200, variance: 30 * 30, n: 60 };

  it("flags a batch far outside the mean's noise band", () => {
    expect(detectShift(settled, [130, 125, 135, 128])).toBe(true);
  });

  it("ignores ordinary noise", () => {
    expect(detectShift(settled, [190, 215, 205, 185])).toBe(false);
  });

  it("needs enough batch and prior samples, and some variance", () => {
    expect(detectShift(settled, [130, 125].slice(0, SHIFT_MIN_BATCH - 1))).toBe(false);
    expect(detectShift({ ...settled, n: SHIFT_MIN_PRIOR - 1 }, [130, 125, 135])).toBe(false);
    expect(detectShift({ ...settled, variance: 0 }, [130, 125, 135])).toBe(false);
  });

  it("only trusts a prior with enough (staleness-adjusted) samples", () => {
    expect(detectShift(settled, [130, 125, 135, 128], SHIFT_MIN_PRIOR - 1)).toBe(false);
  });

  it("a detected improvement moves the mean much further in one test", () => {
    const batch = [130, 125, 135, 128];
    let floorOnly: ModelState = settled;
    for (const v of batch) floorOnly = update(floorOnly, v);
    const shifted = updateMany(settled, batch)!;
    // Floor-rate updates barely move a 60-sample mean; a detected
    // shift gets a third or more of the way to the new level.
    expect(200 - floorOnly.mean).toBeLessThan(15);
    expect(200 - shifted.mean).toBeGreaterThan(0.3 * (200 - 130));
  });

  it("one shifted test moves a settled mean at most half of the way", () => {
    const prior: ModelState = { mean: 100, variance: 100, n: 500 };
    for (const k of [SHIFT_RESET_N, 10, 20, 40]) {
      expect(detectShift(prior, Array(k).fill(200))).toBe(true);
      const out = updateMany(prior, Array(k).fill(200))!;
      // Half of the way, or the floor rate's own move for long batches
      // (shift detection never moves it further than that).
      const floorMove = 1 - (1 - ALPHA_FLOOR) ** k;
      const cap = Math.max(0.5, floorMove);
      expect(out.mean - 100).toBeLessThanOrEqual(cap * 100 + 1e-9);
    }
  });

  it("rarely fires on a stationary typist with ordinary test-to-test spread", () => {
    // Deterministic LCG + Box-Muller: lognormal latencies (median
    // 120ms, σ = 0.25) with a 4% per-test random effect.
    let seedV = 7;
    const rng = () => {
      seedV = (seedV * 1103515245 + 12345) & 0x7fffffff;
      return (seedV + 0.5) / 0x80000000;
    };
    const gauss = () =>
      Math.sqrt(-2 * Math.log(rng())) * Math.cos(2 * Math.PI * rng());
    for (const k of [3, 10, 20]) {
      let st: ModelState | null = null;
      let alarms = 0;
      let checked = 0;
      for (let t = 0; t < 600; t++) {
        const effect = 0.04 * gauss();
        const batch = Array.from({ length: k }, () =>
          120 * Math.exp(effect + 0.25 * gauss()),
        );
        if (st && t >= 40) {
          checked++;
          if (detectShift(st, batch)) alarms++;
        }
        st = updateMany(st, batch);
      }
      expect(alarms / checked).toBeLessThan(0.02);
    }
  });

  it("only tests the shift against `shiftEvidence` when given", () => {
    // Clean timings say nothing changed; the extra slow samples are
    // mistake costs and must not trigger a reset.
    const clean = [200, 198, 205];
    const withSlips = [...clean, 900, 900];
    const guarded = updateMany(settled, withSlips, { shiftEvidence: clean })!;
    const unguarded = updateMany(settled, withSlips)!;
    expect(guarded.mean).toBeLessThan(unguarded.mean);
  });
});
