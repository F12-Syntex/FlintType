import { describe, expect, it } from "vitest";
import type { HistoryTest } from "@/types/history";
import { deriveSkills, deriveTotals } from "./derive-stats";

const mk = (over: Partial<HistoryTest> = {}): HistoryTest => ({
  id: Math.random().toString(36).slice(2),
  startedAtMs: 0,
  completedAtMs: 30_000,
  mode: "casual",
  durationOrWordCount: 30,
  wpm: 90,
  accuracy: 96,
  errorCount: 0,
  wasCompleted: true,
  ...over,
});

const axis = (tests: HistoryTest[], key: string) =>
  deriveSkills(tests, deriveTotals(tests)).find((s) => s.key === key)!;

describe("deriveSkills", () => {
  it("returns four axes in a stable order (no Experience)", () => {
    expect(deriveSkills([], deriveTotals([])).map((s) => s.key)).toEqual([
      "speed",
      "accuracy",
      "consistency",
      "endurance",
    ]);
  });

  it("is all-zero on no data", () => {
    for (const s of deriveSkills([], deriveTotals([]))) expect(s.value).toBe(0);
  });

  it("normalises speed against the 300 wpm ceiling", () => {
    expect(axis([mk({ wpm: 150 })], "speed").value).toBe(50);
    expect(axis([mk({ wpm: 90 })], "speed").value).toBe(30);
  });

  it("rescales accuracy into the 80–100 band", () => {
    expect(axis([mk({ accuracy: 90 })], "accuracy").value).toBe(50);
  });

  it("rewards consistency when WPM varies little", () => {
    const steady = [mk({ wpm: 100 }), mk({ wpm: 100 }), mk({ wpm: 100 })];
    const swingy = [mk({ wpm: 60 }), mk({ wpm: 100 }), mk({ wpm: 140 })];
    expect(axis(steady, "consistency").value).toBe(100);
    expect(axis(swingy, "consistency").value).toBeLessThan(100);
  });

  it("scores endurance from ~30s+ runs against a 250 ceiling", () => {
    const short = [mk({ wpm: 200, completedAtMs: 15_000 })];
    const long = [mk({ wpm: 125, completedAtMs: 60_000 })];
    expect(axis(short, "endurance").value).toBe(0);
    expect(axis(long, "endurance").value).toBe(50); // 125 / 250
  });
});
