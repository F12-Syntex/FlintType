import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import { interleave } from "./apply";
import { pooledRelativeVariance } from "./evidence";
import { type BigramBaselines, bigramTerm, scoreWord, weakness } from "./scoring";
import { type ModelState, updateMany } from "./welford";

/** `weakness` beyond the basics (scoring.test.ts): staleness, real
 *  slip mixtures and the pooled spread prior. */

const MS = (mean: number, n: number, variance = 0): ModelState => ({
  mean,
  variance,
  n,
});

const TEST_BASELINES: BigramBaselines = {
  sameFinger: 160,
  sameHand: 110,
  crossHand: 80,
  unknown: 100,
  overall: 100,
};

describe("weakness — staleness", () => {
  const DAY = 86_400_000;

  it("trusts an old estimate less than a fresh one", () => {
    const fresh = { mean: 250, variance: 0, n: 12, lastSeenMs: 100 * DAY };
    const old = { mean: 250, variance: 0, n: 12, lastSeenMs: 40 * DAY };
    const now = 100 * DAY;
    expect(weakness(old, 100, now)).toBeLessThan(weakness(fresh, 100, now));
  });

  it("a long-unseen pattern drifts back toward exploration", () => {
    const st = { mean: 120, variance: 0, n: 6, lastSeenMs: 0 };
    expect(bigramTerm(st, 100).explore).toBe(0);
    expect(bigramTerm(st, 100, 60 * DAY).explore).toBeGreaterThan(0);
  });
});

/** A real slip mixture, built the way submit builds it: clean "th"
 *  timings around 70ms (quicker than the 80ms cross-hand baseline) with
 *  500ms mistake costs spread through them. */
function fumbled(rate: number, attempts = 60): ModelState {
  const slips = Math.round(rate * attempts);
  const clean = Array.from(
    { length: attempts - slips },
    (_, i) => [60, 70, 80][i % 3]!,
  );
  return updateMany(null, interleave(clean, Array(slips).fill(500)))!;
}

describe("scoreWord — accuracy-aware effective time", () => {
  it("scores a pair fumbled often as weak even when its clean keystrokes are quick", () => {
    // One attempt in four is a slip. The model stores the effective
    // mean (what submit folds in) — with the large variance a slip
    // mixture really has — and the word still scores as a weakness.
    const args = {
      word: "th",
      trigramModels: new Map<string, ModelState>(),
      motorFeatureModels: new Map<string, ModelState>(),
      layout: DEFAULT_HAND_LAYOUT,
      baselines: { bigram: TEST_BASELINES, trigram: 200, motorFeature: 100 },
    };
    const cleanOnly = scoreWord({
      ...args,
      bigramModels: new Map([["th", fumbled(0)]]),
    });
    const score = scoreWord({
      ...args,
      bigramModels: new Map([["th", fumbled(0.25)]]),
    });
    expect(cleanOnly).toBe(0);
    expect(score).toBeGreaterThan(0);
  });
});

describe("weakness — fumble rate", () => {
  const BASE = TEST_BASELINES.crossHand;

  it("scores a pair fumbled 10–25% of the time as weak", () => {
    let prev = 0;
    for (const rate of [0.1, 0.15, 0.2, 0.25]) {
      const w = weakness(fumbled(rate), BASE);
      expect(w).toBeGreaterThan(prev);
      prev = w;
    }
    expect(weakness(fumbled(0.1), BASE)).toBeGreaterThan(5);
    expect(weakness(fumbled(0.25), BASE)).toBeGreaterThan(50);
  });

  it("treats a 5% fumble rate on a quick pair as within noise", () => {
    // Regression pin: effective mean ~88ms vs an 80ms baseline, inside
    // one standard error of a slip mixture's noisy mean.
    const st = fumbled(0.05);
    expect(st.mean).toBeGreaterThan(BASE);
    expect(weakness(st, BASE)).toBe(0);
  });
});

describe("weakness — pooled spread prior", () => {
  it("keeps a one-sample slip well below a well-sampled weak pair", () => {
    // Typical pairs: ~30% coefficient of variation.
    const typical = [MS(120, 40, 36 ** 2), MS(140, 40, 42 ** 2), MS(100, 40, 30 ** 2)];
    const spread = pooledRelativeVariance(typical);
    const oneSlip = MS(480, 1); // first-ever sample was a mistake
    const confirmed = MS(200, 60, 40 ** 2);
    const slipW = weakness(oneSlip, 125, undefined, spread);
    const weakW = weakness(confirmed, 125, undefined, spread);
    expect(slipW).toBeLessThan(0.75 * weakW);
    // The prior is what gives the single sample an error bar at all.
    expect(slipW).toBeLessThan(weakness(oneSlip, 125));
    // …and barely moves a well-measured pattern.
    expect(weakW).toBeCloseTo(weakness(confirmed, 125), 0);
  });
});
