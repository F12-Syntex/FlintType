import { describe, expect, it } from "vitest";
import {
  ALPHA_CAP,
  ALPHA_FLOOR,
  CONFIDENCE_SATURATION,
  confidence,
  learningRate,
  seed,
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
    // Push n into the floor-rate regime so each sample only nudges 2%.
    for (let i = 0; i < 100; i++) s = update(s, 100);
    expect(s.mean).toBeCloseTo(100, 5);
    expect(s.n).toBe(101);
    s = update(s, 200);
    // 100 → ~102 with alpha ≈ 0.02
    expect(s.mean).toBeGreaterThan(101);
    expect(s.mean).toBeLessThan(103);
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
