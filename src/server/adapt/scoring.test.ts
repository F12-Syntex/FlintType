import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import type { TestRow } from "@/types/adapt";
import {
  CHALLENGE_HIGH,
  CHALLENGE_LOW,
  DOUBLED_BIGRAM_BASELINE_FACTOR,
  FATIGUE_MIN_MULT,
  RECENCY_FLOOR,
  RECENCY_RECOVERY_TESTS,
  UNTESTED_BIGRAM_BONUS,
  baselineMean,
  bigramWeakness,
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

describe("predictedWordMs", () => {
  it("sums bigram means in the word", () => {
    const m = new Map([
      ["th", MS(120, 5)],
      ["he", MS(140, 5)],
    ]);
    expect(predictedWordMs("the", m, 200)).toBe(260);
  });

  it("falls back to baseline for cold bigrams", () => {
    const m = new Map<string, ModelState>();
    expect(predictedWordMs("the", m, 200)).toBe(400);
  });

  it("returns 0 for words shorter than 2 chars", () => {
    expect(predictedWordMs("a", new Map(), 200)).toBe(0);
    expect(predictedWordMs("", new Map(), 200)).toBe(0);
  });
});

describe("scoreWord", () => {
  const cold = {
    bigramModels: new Map<string, ModelState>(),
    trigramModels: new Map<string, ModelState>(),
    motorFeatureModels: new Map<string, ModelState>(),
    layout: DEFAULT_HAND_LAYOUT,
    baselines: { bigram: 100, trigram: 200, motorFeature: 100 },
  };

  it("surfaces words built entirely of unsampled bigrams via the exploration bonus", () => {
    // 'test' has 3 bigrams (te, es, st), all unsampled. Each contributes
    // UNTESTED_BIGRAM_BONUS to bigSum so the algorithm prefers seeing
    // these over warm-but-confident words.
    expect(scoreWord({ word: "test", ...cold })).toBe(
      3 * UNTESTED_BIGRAM_BONUS,
    );
  });

  it("rises when a bigram is slow with enough samples", () => {
    const slow = scoreWord({
      ...cold,
      word: "the",
      bigramModels: new Map([
        ["th", MS(300, 60)],
        ["he", MS(120, 60)],
      ]),
    });
    expect(slow).toBeGreaterThan(0);
  });

  it("does not double-count a feature emitted by multiple bigrams", () => {
    // 'aa' produces same_finger_L5 twice; counted once. The bigram
    // 'aa' itself is pre-sampled (and fast) so the exploration bonus
    // doesn't enter the picture — we want to isolate motor-feature
    // dedup, not bigram exploration.
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
    // Same single feature contribution either way; bigram contribution
    // is also 0 (mean below the doubled-letter-adjusted baseline).
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
      weights: { alpha: 0, beta: 1, gamma: 1 },
    });
    expect(without).toBeLessThan(baseline);
  });

  it("does not over-flag doubled-letter words as weak", () => {
    // 'oo' bigram with mean 130ms is slower than the global bigram
    // baseline (100) but still in the typical doubled-letter band
    // (~ baseline * 1.4 = 140). Without the doubled-letter handicap
    // the algorithm would call it weak; with it, the gap is 0.
    const looksWeakWithoutHandicap = scoreWord({
      ...cold,
      word: "look",
      bigramModels: new Map([
        ["lo", MS(80, 60)],
        ["oo", MS(130, 60)],
        ["ok", MS(80, 60)],
      ]),
    });
    // No exploration bonus (all bigrams sampled). 'lo' and 'ok' are
    // faster than baseline → 0. 'oo' would be (130-100)*conf = ~30
    // *without* the handicap, but with the handicap it's
    // max(0, 130 - 100*1.4)*conf = 0.
    expect(looksWeakWithoutHandicap).toBe(0);
  });
});

describe("bigramWeakness", () => {
  it("matches plain weakness on distinct-letter bigrams", () => {
    const st = MS(150, 60);
    expect(bigramWeakness(st, 100, false)).toBe(weakness(st, 100));
  });

  it("inflates the comparison baseline for doubled-letter bigrams", () => {
    const st = MS(130, 60);
    // 130ms is above the global bigram baseline 100, but inside the
    // doubled-letter band (100 * 1.4 = 140). The doubled path returns 0.
    expect(bigramWeakness(st, 100, true)).toBe(0);
    // The same state on a distinct-letter bigram still flags weak.
    expect(bigramWeakness(st, 100, false)).toBeGreaterThan(0);
  });

  it("still flags genuinely slow doubled bigrams once past the band", () => {
    // 200ms is well above the inflated baseline (140) → weak.
    const st = MS(200, 60);
    expect(bigramWeakness(st, 100, true)).toBeGreaterThan(0);
  });

  it("respects the configured baseline factor", () => {
    // Sanity check that the constant is what the rest of the file
    // expects — guards against silent re-tuning.
    expect(DOUBLED_BIGRAM_BASELINE_FACTOR).toBeGreaterThan(1);
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
