import { describe, expect, it } from "vitest";
import {
  EXPLORE_SAMPLES,
  SHRINKAGE_PRIOR,
  VARIANCE_PRIOR_N,
  effectiveSamples,
  evidenceWeight,
  exploreWeight,
  patternSpreads,
  pooledRelativeVariance,
  standardError,
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

describe("pooledRelativeVariance", () => {
  it("is 0 when no pattern has two samples", () => {
    expect(pooledRelativeVariance([])).toBe(0);
    expect(pooledRelativeVariance([{ mean: 100, variance: 0, n: 1 }])).toBe(0);
  });

  it("pools CV² weighted by n − 1", () => {
    const v = pooledRelativeVariance([
      { mean: 100, variance: 100, n: 2 }, // CV² 0.01, weight 1
      { mean: 200, variance: 1600, n: 4 }, // CV² 0.04, weight 3
    ]);
    expect(v).toBeCloseTo((0.01 + 3 * 0.04) / 4, 10);
  });

  it("feeds one spread per pattern type", () => {
    const m = new Map([["a", { mean: 100, variance: 400, n: 5 }]]);
    const s = patternSpreads({ bigram: m, trigram: new Map(), motorFeature: m });
    expect(s.bigram).toBeCloseTo(0.04, 10);
    expect(s.trigram).toBe(0);
    expect(s.word).toBe(0);
  });
});

describe("standardError", () => {
  it("is the raw √(var / n) without a prior", () => {
    expect(standardError({ mean: 100, variance: 400, n: 4 }, 4)).toBeCloseTo(10, 10);
    expect(standardError({ mean: 100, variance: 0, n: 1 }, 1)).toBe(0);
  });

  it("gives a one-sample pattern the pooled spread instead of zero", () => {
    const se = standardError({ mean: 400, variance: 0, n: 1 }, 1, 0.09);
    const prior = 0.09 * 400 * 400;
    expect(se).toBeCloseTo(Math.sqrt((VARIANCE_PRIOR_N * prior) / (1 + VARIANCE_PRIOR_N)), 10);
  });

  it("lets the pattern's own variance take over as samples arrive", () => {
    const st = { mean: 100, variance: 400, n: 39 };
    const raw = standardError(st, 39);
    const withPrior = standardError(st, 39, 0.5);
    expect(withPrior).toBeGreaterThan(raw);
    expect(withPrior).toBeLessThan(2 * raw);
  });
});
