import { describe, expect, it } from "vitest";
import type { HistoryTest } from "@/types/history";
import {
  derivePersonalBests,
  deriveSkills,
  deriveTotals,
} from "./derive-stats";

const mk = (over: Partial<HistoryTest> = {}): HistoryTest => ({
  id: Math.random().toString(36).slice(2),
  startedAtMs: 0,
  completedAtMs: 30_000,
  mode: "casual",
  durationOrWordCount: 30,
  lengthMode: "words",
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

describe("derivePersonalBests", () => {
  it("separates a 60-word run from a 60-second run (no bucket merge)", () => {
    const pbs = derivePersonalBests([
      mk({ durationOrWordCount: 60, lengthMode: "words", wpm: 110 }),
      mk({ durationOrWordCount: 60, lengthMode: "time", wpm: 95 }),
    ]);
    // Two distinct buckets, not one — same mode + amount but different
    // length unit must rank independently (issue #71).
    expect(pbs.length).toBe(2);
    const words = pbs.find((b) => b.lengthMode === "words");
    const time = pbs.find((b) => b.lengthMode === "time");
    expect(words?.bestWpm).toBe(110);
    expect(time?.bestWpm).toBe(95);
    // Neither crowns the other: the time bucket keeps its own (lower)
    // best rather than inheriting the faster words run.
    expect(time?.bestWpm).not.toBe(110);
  });

  it("buckets legacy null-lengthMode rows under their own key", () => {
    const pbs = derivePersonalBests([
      mk({ durationOrWordCount: 60, lengthMode: null, wpm: 80 }),
      mk({ durationOrWordCount: 60, lengthMode: "time", wpm: 95 }),
    ]);
    expect(pbs.length).toBe(2);
    expect(pbs.find((b) => b.lengthMode === null)?.bestWpm).toBe(80);
  });

  it("merges same-(mode, lengthMode, amount) runs into one bucket", () => {
    const pbs = derivePersonalBests([
      mk({ durationOrWordCount: 60, lengthMode: "time", wpm: 90 }),
      mk({ durationOrWordCount: 60, lengthMode: "time", wpm: 105 }),
    ]);
    expect(pbs.length).toBe(1);
    expect(pbs[0]?.bestWpm).toBe(105);
    expect(pbs[0]?.testsCount).toBe(2);
  });
});
