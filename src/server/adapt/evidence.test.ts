import { describe, expect, it } from "vitest";
import {
  EXPLORE_SAMPLES,
  SHRINKAGE_PRIOR,
  effectiveSamples,
  evidenceWeight,
  exploreWeight,
} from "./evidence";
import { EWMA_MEMORY, STALENESS_HALF_LIFE_DAYS } from "./welford";

const DAY = 86_400_000;

describe("evidenceWeight", () => {
  it("is 0 with no samples", () => {
    expect(evidenceWeight(0)).toBe(0);
    expect(evidenceWeight(-1)).toBe(0);
  });

  it("is the n / (n + prior) shrinkage factor", () => {
    expect(evidenceWeight(SHRINKAGE_PRIOR)).toBeCloseTo(0.5, 5);
    expect(evidenceWeight(1)).toBeCloseTo(1 / (1 + SHRINKAGE_PRIOR), 5);
  });

  it("rises monotonically and saturates at the EWMA memory", () => {
    expect(evidenceWeight(10)).toBeGreaterThan(evidenceWeight(5));
    expect(evidenceWeight(EWMA_MEMORY * 10)).toBeCloseTo(
      evidenceWeight(EWMA_MEMORY),
      5,
    );
    expect(evidenceWeight(EWMA_MEMORY)).toBeLessThan(1);
  });
});

describe("exploreWeight", () => {
  it("is full for an unseen pattern and fades linearly to 0", () => {
    expect(exploreWeight(0)).toBe(1);
    expect(exploreWeight(EXPLORE_SAMPLES / 2)).toBeCloseTo(0.5, 5);
    expect(exploreWeight(EXPLORE_SAMPLES)).toBe(0);
    expect(exploreWeight(EXPLORE_SAMPLES * 3)).toBe(0);
  });
});

describe("effectiveSamples", () => {
  it("is the raw count without a clock or a last-seen stamp", () => {
    expect(effectiveSamples({ mean: 1, variance: 0, n: 12 })).toBe(12);
    expect(
      effectiveSamples({ mean: 1, variance: 0, n: 12 }, 50 * DAY),
    ).toBe(12);
  });

  it("decays with time since the pattern was last typed", () => {
    const st = { mean: 1, variance: 0, n: 12, lastSeenMs: 0 };
    expect(effectiveSamples(st, STALENESS_HALF_LIFE_DAYS * DAY)).toBeCloseTo(6, 5);
  });
});
