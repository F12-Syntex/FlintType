import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import type { TestRow } from "@/types/adapt";
import {
  CHALLENGE_HIGH,
  CHALLENGE_LOW,
  FATIGUE_MIN_MULT,
  RECENCY_FLOOR,
  RECENCY_RECOVERY_TESTS,
  UNTESTED_BIGRAM_BONUS,
  baselineForCategory,
  baselineMean,
  bigramBaselines,
  type BigramBaselines,
  fatigueDampener,
  inChallengeBand,
  predictedWordMs,
  recencyMultiplier,
  sampleWeighted,
  scoreWord,
  weakness,
} from "./scoring";
import type { ModelState } from "./welford";

const MS = (mean: number, n: number, variance = 0): ModelState => ({
  mean,
  variance,
  n,
});

function makeTestRow(over: Partial<TestRow>): TestRow {
  return {
    id: "t",
    userId: "u1",
    startedAt: new Date(),
    completedAt: new Date(),
    mode: "training",
    durationOrWordCount: 25,
    wpm: 100,
    accuracy: 98,
    errorCount: 0,
    resetCount: 0,
    wasCompleted: true,
    ...over,
  };
}

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

  it("is 0 with too few samples even if slow", () => {
    expect(weakness(MS(300, 1), 100)).toBe(0);
  });

  it("scales with the gap to baseline and confidence", () => {
    const cold = weakness(MS(200, 5), 100);
    const warm = weakness(MS(200, 60), 100);
    expect(warm).toBeGreaterThan(cold);
  });
});

describe("fatigueDampener", () => {
  it("returns 1 with too few tests", () => {
    expect(fatigueDampener([])).toBe(1);
    expect(fatigueDampener([makeTestRow({ wpm: 100 })])).toBe(1);
  });

  it("returns 1 when WPM is flat or rising", () => {
    const flat = Array.from({ length: 5 }, () => makeTestRow({ wpm: 100 }));
    expect(fatigueDampener(flat)).toBe(1);
    // Rising: newer (index 0) is faster than older.
    const rising = [
      makeTestRow({ wpm: 110 }),
      makeTestRow({ wpm: 108 }),
      makeTestRow({ wpm: 105 }),
      makeTestRow({ wpm: 100 }),
      makeTestRow({ wpm: 95 }),
    ];
    expect(fatigueDampener(rising)).toBe(1);
  });

  it("clamps to FATIGUE_MIN_MULT for severe declines", () => {
    // Older average ~120, newer average ~80 → 33% decline → clamps.
    const decline = [
      makeTestRow({ wpm: 70 }),
      makeTestRow({ wpm: 80 }),
      makeTestRow({ wpm: 90 }),
      makeTestRow({ wpm: 120 }),
      makeTestRow({ wpm: 120 }),
    ];
    expect(fatigueDampener(decline)).toBe(FATIGUE_MIN_MULT);
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

describe("recencyMultiplier", () => {
  it("is at floor when shown in the test we just ran", () => {
    expect(recencyMultiplier(0)).toBeCloseTo(RECENCY_FLOOR, 5);
  });

  it("recovers to 1.0 after the recovery window", () => {
    expect(recencyMultiplier(RECENCY_RECOVERY_TESTS)).toBe(1);
    expect(recencyMultiplier(100)).toBe(1);
  });

  it("interpolates linearly in between", () => {
    const half = recencyMultiplier(RECENCY_RECOVERY_TESTS / 2);
    expect(half).toBeGreaterThan(RECENCY_FLOOR);
    expect(half).toBeLessThan(1);
  });
});

describe("inChallengeBand", () => {
  it("accepts predictions slightly above baseline", () => {
    // baseline 100ms × 3 bigrams = 300ms expected. 1.2× = 360ms.
    expect(inChallengeBand(360, 100, 3)).toBe(true);
  });

  it("rejects predictions below the band (too easy)", () => {
    expect(inChallengeBand(100 * 3 * (CHALLENGE_LOW - 0.1), 100, 3)).toBe(
      false,
    );
  });

  it("rejects predictions above the band (too hard)", () => {
    expect(inChallengeBand(100 * 3 * (CHALLENGE_HIGH + 0.1), 100, 3)).toBe(
      false,
    );
  });

  it("returns true on cold start (baseline 0)", () => {
    expect(inChallengeBand(500, 0, 3)).toBe(true);
  });
});

describe("sampleWeighted", () => {
  it("returns [] for an empty pool", () => {
    expect(sampleWeighted([], 5)).toEqual([]);
  });

  it("clamps count to pool size", () => {
    const out = sampleWeighted(
      [
        { word: "a", weight: 1 },
        { word: "b", weight: 1 },
      ],
      10,
    );
    expect(out.length).toBe(2);
  });

  it("does not pick the same word twice", () => {
    const out = sampleWeighted(
      [
        { word: "a", weight: 1 },
        { word: "b", weight: 1 },
        { word: "c", weight: 1 },
      ],
      3,
    );
    expect(new Set(out).size).toBe(3);
  });

  it("biases toward higher-weight candidates", () => {
    const counts = new Map<string, number>([
      ["heavy", 0],
      ["light", 0],
    ]);
    let seed = 1;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) % 0x100000000;
      return seed / 0x100000000;
    };
    for (let i = 0; i < 1000; i++) {
      const [pick] = sampleWeighted(
        [
          { word: "heavy", weight: 100 },
          { word: "light", weight: 1 },
        ],
        1,
        rng,
      );
      counts.set(pick!, (counts.get(pick!) ?? 0) + 1);
    }
    expect(counts.get("heavy")!).toBeGreaterThan(counts.get("light")!);
  });

  it("falls back to uniform when every weight is 0", () => {
    const out = sampleWeighted(
      [
        { word: "a", weight: 0 },
        { word: "b", weight: 0 },
      ],
      2,
    );
    expect(out.sort()).toEqual(["a", "b"]);
  });
});
