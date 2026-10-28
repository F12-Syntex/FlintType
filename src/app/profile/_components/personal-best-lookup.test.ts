import { describe, expect, it } from "vitest";
import type { PersonalBest } from "./derive-stats";
import { indexBestsByAmount } from "./personal-best-lookup";

const pb = (over: Partial<PersonalBest> = {}): PersonalBest => ({
  mode: "casual",
  amount: 30,
  lengthMode: "time",
  bestWpm: 100,
  bestAccuracy: 97,
  testsCount: 1,
  ...over,
});

const TIME = { unit: "time" as const, amounts: [15, 30, 60, 120] };
const WORDS = { unit: "words" as const, amounts: [10, 25, 50, 100] };
const ALL_MODES = ["casual", "training", "race"];

describe("indexBestsByAmount", () => {
  it("keeps a run in the strip matching its unit", () => {
    const bests = [pb({ amount: 30, lengthMode: "time", bestWpm: 120 })];
    expect(
      indexBestsByAmount(bests, { modes: ALL_MODES, ...TIME }).get(30)?.bestWpm,
    ).toBe(120);
    expect(
      indexBestsByAmount(bests, { modes: ALL_MODES, ...WORDS }).size,
    ).toBe(0);
  });

  it("never shows a 60-word run as a 60-second best", () => {
    const bests = [pb({ amount: 60, lengthMode: "words", bestWpm: 140 })];
    expect(
      indexBestsByAmount(bests, { modes: ALL_MODES, ...TIME }).has(60),
    ).toBe(false);
  });

  it("excludes quote runs from both strips", () => {
    const bests = [pb({ amount: 1, lengthMode: "quote" })];
    expect(indexBestsByAmount(bests, { modes: ALL_MODES, ...TIME }).size).toBe(0);
    expect(indexBestsByAmount(bests, { modes: ALL_MODES, ...WORDS }).size).toBe(0);
  });

  it("files unit-less (legacy / MonkeyType) rows by their home amount", () => {
    const bests = [
      pb({ amount: 60, lengthMode: null, bestWpm: 110 }),
      pb({ amount: 25, lengthMode: null, bestWpm: 130 }),
    ];
    const time = indexBestsByAmount(bests, { modes: ALL_MODES, ...TIME });
    const words = indexBestsByAmount(bests, { modes: ALL_MODES, ...WORDS });
    expect([...time.keys()]).toEqual([60]);
    expect([...words.keys()]).toEqual([25]);
  });

  it("filters by mode", () => {
    const bests = [
      pb({ mode: "race", amount: 30, bestWpm: 150 }),
      pb({ mode: "casual", amount: 30, bestWpm: 90 }),
    ];
    const casual = indexBestsByAmount(bests, { modes: ["casual"], ...TIME });
    expect(casual.get(30)?.bestWpm).toBe(90);
  });

  it("keeps the highest WPM per amount across modes", () => {
    const bests = [
      pb({ mode: "casual", amount: 30, bestWpm: 90, bestAccuracy: 99 }),
      pb({ mode: "training", amount: 30, bestWpm: 120, bestAccuracy: 95 }),
    ];
    const best = indexBestsByAmount(bests, { modes: ALL_MODES, ...TIME }).get(30);
    expect(best?.bestWpm).toBe(120);
    expect(best?.bestAccuracy).toBe(95);
  });
});
