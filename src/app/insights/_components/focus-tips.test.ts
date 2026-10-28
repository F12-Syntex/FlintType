import { describe, expect, it } from "vitest";
import type {
  HistorySummaryOutput,
  HistoryTest,
  HistoryWeakness,
} from "@/types/history";
import { buildFocusTips, recentAccuracy, WORST_WORDS_MIN } from "./focus-tips";

function weak(key: string, meanMs: number, weakness = 1): HistoryWeakness {
  return { key, meanMs, weakness, sampleCount: 20 };
}

function run(accuracy: number, wasCompleted = true): HistoryTest {
  return {
    id: `t-${Math.random()}`,
    startedAtMs: 0,
    completedAtMs: 0,
    mode: "training",
    durationOrWordCount: 25,
    lengthMode: "words",
    wpm: 100,
    accuracy,
    errorCount: 0,
    wasCompleted,
  };
}

function snap(over: Partial<HistorySummaryOutput> = {}): HistorySummaryOutput {
  return {
    recentTests: [],
    weakestPairs: [],
    weakestTrigrams: [],
    weakestWords: [],
    cold: false,
    bigramBaselineMs: 0,
    trigramBaselineMs: 0,
    wordBaselineMs: 0,
    monkeytype: null,
    tags: [],
    eligibleTags: [],
    rank: null,
    subjectAvatarUrl: null,
    subjectUserId: "user_1",
    lifetimeStats: { drillsCompleted: 0, racesFinished: 0, racesWon: 0 },
    ...over,
  };
}

describe("buildFocusTips", () => {
  it("sends a cold model to the practice page at /, not /app", () => {
    const tips = buildFocusTips(snap({ cold: true, weakestPairs: [weak("be", 90)] }));
    expect(tips).toHaveLength(1);
    expect(tips[0]!.id).toBe("cold");
    expect(tips[0]!.action?.href).toBe("/");
  });

  it("links the slowest pair to the weakness drill with a % vs baseline", () => {
    const tips = buildFocusTips(
      snap({ weakestPairs: [weak("be", 121)], bigramBaselineMs: 100 }),
    );
    const pair = tips.find((t) => t.id === "pair")!;
    expect(pair.title).toContain("be");
    expect(pair.detail).toContain("21% slower");
    expect(pair.action?.href).toBe("/drills/weakness");
  });

  it("locks the worst-words drill until enough slow words exist", () => {
    const few = buildFocusTips(
      snap({ weakestWords: [weak("between", 478)], wordBaselineMs: 237 }),
    ).find((t) => t.id === "word")!;
    expect(few.action).toBeNull();
    expect(few.lockedNote).toContain(String(WORST_WORDS_MIN));

    const many = buildFocusTips(
      snap({
        weakestWords: Array.from({ length: WORST_WORDS_MIN }, (_, i) =>
          weak(`w${i}`, 300),
        ),
        wordBaselineMs: 200,
      }),
    ).find((t) => t.id === "word")!;
    expect(many.action?.href).toBe("/drills/worst-words");
  });

  it("omits the percentage when there is no baseline", () => {
    const pair = buildFocusTips(snap({ weakestPairs: [weak("be", 90)] }))[0]!;
    expect(pair.detail).not.toContain("%");
  });

  it("adds an accuracy tip when recent accuracy is low", () => {
    const tips = buildFocusTips(
      snap({ recentTests: [run(90), run(92), run(91)] }),
    );
    const acc = tips.find((t) => t.id === "accuracy")!;
    expect(acc.title).toContain("91.0%");
    expect(acc.action?.href).toBe("/drills/tricky");
  });

  it("falls back to a ceiling tip when nothing stands out", () => {
    const tips = buildFocusTips(
      snap({ recentTests: [run(99), run(98), run(99)] }),
    );
    expect(tips.map((t) => t.id)).toEqual(["ceiling"]);
  });

  it("never returns more than three tips", () => {
    const tips = buildFocusTips(
      snap({
        weakestPairs: [weak("be", 120)],
        weakestWords: [weak("between", 400)],
        recentTests: [run(80), run(80), run(80)],
        bigramBaselineMs: 100,
        wordBaselineMs: 200,
      }),
    );
    expect(tips.map((t) => t.id)).toEqual(["pair", "word", "accuracy"]);
  });
});

describe("recentAccuracy", () => {
  it("averages only completed runs, newest first, capped at the window", () => {
    const tests = [run(90), run(10, false), run(92), run(94)];
    expect(recentAccuracy(tests)).toEqual({ mean: 92, runs: 3 });
  });
  it("returns null with too few runs", () => {
    expect(recentAccuracy([run(90), run(80)])).toBeNull();
  });
});
