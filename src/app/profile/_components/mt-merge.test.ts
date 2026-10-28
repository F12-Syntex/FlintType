import { describe, expect, it } from "vitest";
import type { HistoryTest, PublicMonkeytypeStats } from "@/types/history";
import { derivePersonalBests, deriveTotals } from "./derive-stats";
import { mergePersonalBestsWithMt, mergeTotalsWithMt } from "./mt-merge";

const run = (over: Partial<HistoryTest> = {}): HistoryTest => ({
  id: Math.random().toString(36).slice(2),
  startedAtMs: 0,
  completedAtMs: 30_000,
  mode: "casual",
  durationOrWordCount: 30,
  lengthMode: "time",
  wpm: 100,
  accuracy: 97,
  errorCount: 0,
  wasCompleted: true,
  ...over,
});

const mt = (over: Partial<PublicMonkeytypeStats> = {}): PublicMonkeytypeStats => ({
  importedAt: 1,
  pbs: { time: { "30": { wpm: 120, acc: 99 } }, words: {} },
  ...over,
});

describe("mergeTotalsWithMt", () => {
  it("returns local totals untouched without an import", () => {
    const local = deriveTotals([run()]);
    expect(mergeTotalsWithMt(local, null)).toBe(local);
  });

  it("adds counters and takes the higher best WPM", () => {
    const local = deriveTotals([run({ wpm: 100 })]);
    const merged = mergeTotalsWithMt(
      local,
      mt({ completedTests: 9, startedTests: 10, timeTyping: 60 }),
    );
    expect(merged.testsCompleted).toBe(10);
    expect(merged.testsStarted).toBe(11);
    expect(merged.totalSeconds).toBe(local.totalSeconds + 60);
    expect(merged.bestWpm).toBe(120);
    expect(merged.totalXp).toBeGreaterThan(local.totalXp);
  });
});

describe("mergePersonalBestsWithMt", () => {
  it("lifts a slower local cell to the imported best", () => {
    const merged = mergePersonalBestsWithMt(
      derivePersonalBests([run({ wpm: 100 })]),
      mt(),
    );
    const cell = merged.find((b) => b.mode === "casual" && b.amount === 30);
    expect(cell?.bestWpm).toBe(120);
  });

  it("never lowers a faster local cell", () => {
    const merged = mergePersonalBestsWithMt(
      derivePersonalBests([run({ wpm: 150 })]),
      mt(),
    );
    expect(merged.find((b) => b.amount === 30)?.bestWpm).toBe(150);
  });

  it("adds imported lengths the player has no local run at", () => {
    const merged = mergePersonalBestsWithMt(
      [],
      mt({ pbs: { time: {}, words: { "50": { wpm: 110, acc: 98 } } } }),
    );
    expect(merged).toEqual([
      expect.objectContaining({ mode: "casual", amount: 50, bestWpm: 110, lengthMode: null }),
    ]);
  });
});
