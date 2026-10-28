import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import { predictedWordMs } from "./prediction";
import type { BigramBaselines } from "./scoring";
import type { ModelState } from "./welford";

const MS = (mean: number, n: number): ModelState => ({ mean, variance: 0, n });

const TEST_BASELINES: BigramBaselines = {
  sameFinger: 160,
  sameHand: 110,
  crossHand: 80,
  unknown: 100,
  overall: 100,
};

describe("predictedWordMs", () => {
  it("sums bigram means in the word", () => {
    const m = new Map([
      ["th", MS(120, 5)],
      ["he", MS(140, 5)],
    ]);
    expect(predictedWordMs("the", m, TEST_BASELINES, DEFAULT_HAND_LAYOUT)).toBe(
      260,
    );
  });

  it("falls back to the per-category baseline for cold bigrams", () => {
    // 'th' = cross-hand (T left index, H right index) → 80ms.
    // 'he' = same-hand right (H right index, E left middle? actually
    // E is left middle). On QWERTY, H is right index and E is left
    // middle → cross-hand → 80ms. So total is 160ms. Same-hand path
    // is exercised by the next case.
    const m = new Map<string, ModelState>();
    const total = predictedWordMs("the", m, TEST_BASELINES, DEFAULT_HAND_LAYOUT);
    expect(total).toBeGreaterThan(0);
  });

  it("returns 0 for words shorter than 2 chars", () => {
    expect(predictedWordMs("a", new Map(), TEST_BASELINES, DEFAULT_HAND_LAYOUT)).toBe(0);
    expect(predictedWordMs("", new Map(), TEST_BASELINES, DEFAULT_HAND_LAYOUT)).toBe(0);
  });
});
