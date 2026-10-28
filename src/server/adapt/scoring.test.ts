import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import {
  UNTESTED_BIGRAM_BONUS,
  baselineForCategory,
  baselineMean,
  bigramBaselines,
  type BigramBaselines,
  bigramTerm,
  predictedWordMs,
  scoreWord,
  weakness,
} from "./scoring";
import type { ModelState } from "./welford";

const MS = (mean: number, n: number, variance = 0): ModelState => ({
  mean,
  variance,
  n,
});

describe("baselineMean", () => {
  it("is 0 for an empty model map", () => {
    expect(baselineMean(new Map())).toBe(0);
  });

  it("weights by sample count", () => {
    const m = new Map([
      ["a", MS(100, 1)],
      ["b", MS(200, 99)],
    ]);
    // Weighted: (100*1 + 200*99) / 100 = 199
    expect(baselineMean(m)).toBeCloseTo(199, 5);
  });
});

describe("weakness", () => {
  it("is 0 for fast patterns (mean below baseline)", () => {
    expect(weakness(MS(100, 30), 150)).toBe(0);
  });

  it("shrinks a low-sample estimate toward the baseline instead of cutting it off", () => {
    // One slow sample is weak evidence: it counts, but only a little
    // (no hard n < 3 cliff — patterns enter scoring smoothly).
    const one = weakness(MS(300, 1), 100);
    expect(one).toBeGreaterThan(0);
    expect(one).toBeLessThan(0.25 * 200);
    // More samples → more of the 200ms gap is trusted, monotonically.
    let prev = one;
    for (const n of [2, 3, 5, 10, 30]) {
      const w = weakness(MS(300, n), 100);
      expect(w).toBeGreaterThan(prev);
      prev = w;
    }
  });

  it("scales with the gap to baseline and confidence", () => {
    const cold = weakness(MS(200, 5), 100);
    const warm = weakness(MS(200, 60), 100);
    expect(warm).toBeGreaterThan(cold);
  });
});

/** Per-category baselines used across scoreWord / predictedWordMs
 *  tests. Same-finger highest (typing same key twice is mechanically
 *  slowest), cross-hand lowest (parallel finger pre-positioning),
 *  same-hand in between. Numbers are illustrative — chosen to keep
 *  the assertions easy to reason about, not real-world calibrated. */
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

describe("scoreWord", () => {
  const cold = {
    bigramModels: new Map<string, ModelState>(),
    trigramModels: new Map<string, ModelState>(),
    motorFeatureModels: new Map<string, ModelState>(),
    layout: DEFAULT_HAND_LAYOUT,
    baselines: { bigram: TEST_BASELINES, trigram: 200, motorFeature: 100 },
  };

  it("surfaces words built entirely of unsampled bigrams via the exploration bonus", () => {
    // 'test' has 3 bigrams (te, es, st), all unsampled. Each contributes
    // UNTESTED_BIGRAM_BONUS to bigSum so the algorithm prefers seeing
    // these over warm-but-confident words.
    expect(scoreWord({ word: "test", ...cold })).toBe(
      3 * UNTESTED_BIGRAM_BONUS,
    );
  });

  it("rises when a sampled bigram is meaningfully slower than its category baseline", () => {
    // 'th' is cross-hand on QWERTY (T left index, H right index).
    // Cross-hand baseline is 80ms. A 300ms 'th' is well past that.
    const slow = scoreWord({
      ...cold,
      word: "the",
      bigramModels: new Map([
        ["th", MS(300, 60)],
        ["he", MS(80, 60)],
      ]),
    });
    expect(slow).toBeGreaterThan(0);
  });

  it("does not flag a same-finger pair just because it's slower than overall mean", () => {
    // On QWERTY 'lo' is same-finger (right ring, both O and L).
    // Same-finger baseline is 160ms. A 130ms 'lo' is below that —
    // unremarkable for the motion class. Under a global baseline
    // (100ms) the old algorithm would have flagged it as weak.
    const looksWeak = scoreWord({
      ...cold,
      word: "lo",
      bigramModels: new Map([["lo", MS(130, 60)]]),
    });
    expect(looksWeak).toBe(0);
  });

  it("still flags a same-finger pair that's slow even for its category", () => {
    const reallyWeak = scoreWord({
      ...cold,
      word: "lo",
      bigramModels: new Map([["lo", MS(260, 60)]]),
    });
    expect(reallyWeak).toBeGreaterThan(0);
  });

  it("does not double-count a feature emitted by multiple bigrams", () => {
    // 'aa' is same-finger (left pinky doubled). Same-finger baseline
    // 160. With mean 50ms, weakness = 0 (way below). Both single and
    // triple words hit one feature once via dedup, so totals match.
    const bigramModels = new Map([["aa", MS(50, 60)]]);
    const single = scoreWord({
      ...cold,
      word: "aa",
      bigramModels,
      motorFeatureModels: new Map([["same_finger_L5", MS(300, 60)]]),
    });
    const triple = scoreWord({
      ...cold,
      word: "aaaa",
      bigramModels,
      motorFeatureModels: new Map([["same_finger_L5", MS(300, 60)]]),
    });
    expect(triple).toBeCloseTo(single, 5);
  });

  it("zero alpha kills the bigram contribution", () => {
    const args = {
      ...cold,
      word: "the",
      bigramModels: new Map([
        ["th", MS(300, 60)],
        ["he", MS(120, 60)],
      ]),
    };
    const baseline = scoreWord(args);
    const without = scoreWord({
      ...args,
      weights: { alpha: 0, beta: 1, gamma: 1, delta: 1 },
    });
    expect(without).toBeLessThan(baseline);
  });

  it("weights a transferable motor-feature weakness above a single-word weakness", () => {
    // Both candidates share the same warm, fast bigram ('aa' below its
    // same-finger baseline → 0 bigram contribution, and sampled so no
    // exploration bonus). The first's only weakness is a slow *shared
    // motion*; the second's only weakness is a slow *whole-word* mean,
    // with an identical gap + sample count so the confidence factor
    // cancels. Under DEFAULT_WEIGHTS (γ=2 ≫ δ=0.5) the generalisable
    // motor-feature signal must win — that's what keeps the selector
    // training the motion instead of memorising the word.
    const fastBigram = new Map([["aa", MS(50, 60)]]);
    const motorWeak = scoreWord({
      ...cold,
      word: "aa",
      bigramModels: fastBigram,
      motorFeatureModels: new Map([["same_finger_L5", MS(300, 60)]]),
    });
    const wordWeak = scoreWord({
      ...cold,
      word: "aa",
      bigramModels: fastBigram,
      baselines: { ...cold.baselines, word: 100 },
      wordModels: new Map([["aa", MS(300, 60)]]),
    });
    expect(motorWeak).toBeGreaterThan(0);
    expect(wordWeak).toBeGreaterThan(0);
    expect(motorWeak).toBeGreaterThan(wordWeak);
  });
});

describe("bigramBaselines", () => {
  it("returns 0 across the board for an empty model", () => {
    const b = bigramBaselines(new Map(), DEFAULT_HAND_LAYOUT);
    expect(b.overall).toBe(0);
    expect(b.sameFinger).toBe(0);
    expect(b.sameHand).toBe(0);
    expect(b.crossHand).toBe(0);
  });

  it("partitions samples by mechanical category", () => {
    // QWERTY finger map (per key-map.ts):
    //   'lo' — both R4 → same-finger.
    //   'fd' — F is L2, D is L3 → same-hand (left, different finger).
    //   'ka' — K is R3, A is L5 → cross-hand.
    const b = bigramBaselines(
      new Map([
        ["lo", MS(200, 100)],
        ["fd", MS(120, 100)],
        ["ka", MS(70, 100)],
      ]),
      DEFAULT_HAND_LAYOUT,
    );
    expect(b.sameFinger).toBeCloseTo(200, 5);
    expect(b.sameHand).toBeCloseTo(120, 5);
    expect(b.crossHand).toBeCloseTo(70, 5);
  });

  it("falls back to overall when a category has no samples", () => {
    // Only same-finger samples present — same-hand and cross-hand
    // inherit the overall mean rather than 0.
    const b = bigramBaselines(
      new Map([["lo", MS(180, 50)]]),
      DEFAULT_HAND_LAYOUT,
    );
    expect(b.sameHand).toBeCloseTo(b.overall, 5);
    expect(b.crossHand).toBeCloseTo(b.overall, 5);
  });
});

describe("baselineForCategory", () => {
  it("routes to the right field for each category", () => {
    expect(baselineForCategory("same-finger", TEST_BASELINES)).toBe(160);
    expect(baselineForCategory("same-hand", TEST_BASELINES)).toBe(110);
    expect(baselineForCategory("cross-hand", TEST_BASELINES)).toBe(80);
    expect(baselineForCategory("unknown", TEST_BASELINES)).toBe(100);
  });
});

describe("bigramTerm", () => {
  it("earns the full exploration bonus for a never-typed bigram", () => {
    expect(bigramTerm(undefined, 100)).toEqual({
      weakness: 0,
      explore: UNTESTED_BIGRAM_BONUS,
    });
  });

  it("hands over from exploration to measured weakness smoothly", () => {
    // A genuinely slow pair: as samples arrive the bonus fades and the
    // weakness grows — no step at any sample count.
    const terms = [1, 2, 3, 4, 5, 6, 10].map((n) => bigramTerm(MS(250, n), 100));
    for (let i = 1; i < terms.length; i++) {
      expect(terms[i]!.explore).toBeLessThanOrEqual(terms[i - 1]!.explore);
      expect(terms[i]!.weakness).toBeGreaterThan(terms[i - 1]!.weakness);
    }
    expect(terms[terms.length - 1]!.explore).toBe(0);
  });

  it("a fast, well-sampled pair contributes nothing", () => {
    expect(bigramTerm(MS(60, 50), 100)).toEqual({ weakness: 0, explore: 0 });
  });
});

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

describe("scoreWord — accuracy-aware effective time", () => {
  it("scores a pair fumbled often as weak even when its clean keystrokes are quick", () => {
    // Clean "th" is fast (70ms vs an 80ms cross-hand baseline), but one
    // attempt in four is a slip costing ~600ms. The model stores the
    // effective mean (what submit folds in), which lands well above
    // the baseline — so the word now scores as a weakness.
    const effective = 0.75 * 70 + 0.25 * 600;
    const score = scoreWord({
      word: "th",
      bigramModels: new Map([["th", MS(effective, 60)]]),
      trigramModels: new Map(),
      motorFeatureModels: new Map(),
      layout: DEFAULT_HAND_LAYOUT,
      baselines: { bigram: TEST_BASELINES, trigram: 200, motorFeature: 100 },
    });
    const cleanOnly = scoreWord({
      word: "th",
      bigramModels: new Map([["th", MS(70, 60)]]),
      trigramModels: new Map(),
      motorFeatureModels: new Map(),
      layout: DEFAULT_HAND_LAYOUT,
      baselines: { bigram: TEST_BASELINES, trigram: 200, motorFeature: 100 },
    });
    expect(cleanOnly).toBe(0);
    expect(score).toBeGreaterThan(0);
  });
});
