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
  it("returns five axes in a stable order", () => {
    expect(deriveSkills([], deriveTotals([])).map((s) => s.key)).toEqual([
      "speed",
      "accuracy",
      "consistency",
      "endurance",
      "experience",
    ]);
  });

  it("is all-zero with an em-dash display on no data", () => {
    const skills = deriveSkills([], deriveTotals([]));
    for (const s of skills) expect(s.value).toBe(0);
    expect(axis([], "speed").display).toBe("—");
  });

  it("normalises speed against the 180 wpm ceiling", () => {
    const speed = axis([mk({ wpm: 90 })], "speed");
    expect(speed.value).toBe(50);
    expect(speed.display).toBe("90 wpm");
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

  it("scores endurance only from long (>=45s elapsed) tests", () => {
    const short = [mk({ wpm: 150, completedAtMs: 30_000 })];
    const long = [mk({ wpm: 120, completedAtMs: 60_000 })];
    expect(axis(short, "endurance").value).toBe(0);
    const e = axis(long, "endurance");
    expect(e.value).toBeGreaterThan(0);
    expect(e.display).toBe("120 wpm");
  });
});
