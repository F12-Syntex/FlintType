import { describe, expect, it } from "vitest";
import type { HistoryTest } from "@/types/history";
import { derivePersonalBests, type PersonalBest } from "./derive-stats";
import { pickRecordRunIds } from "./record-runs";

let n = 0;
const run = (over: Partial<HistoryTest> = {}): HistoryTest => ({
  id: `r${++n}`,
  startedAtMs: n * 1000,
  completedAtMs: n * 1000 + 30_000,
  mode: "casual",
  durationOrWordCount: 25,
  lengthMode: "words",
  wpm: 100,
  accuracy: 97,
  errorCount: 0,
  wasCompleted: true,
  ...over,
});

describe("pickRecordRunIds", () => {
  it("crowns the fastest run at a standard length", () => {
    const slow = run({ wpm: 90 });
    const fast = run({ wpm: 120 });
    expect([...pickRecordRunIds([slow, fast])]).toEqual([fast.id]);
  });

  it("never crowns a length with a single run", () => {
    expect(pickRecordRunIds([run({ wpm: 150 })]).size).toBe(0);
  });

  it("ignores race passages of arbitrary length", () => {
    const tests = [
      run({ mode: "race", durationOrWordCount: 21, wpm: 300 }),
      run({ mode: "race", durationOrWordCount: 21, wpm: 310 }),
      run({ mode: "race", durationOrWordCount: 73, wpm: 340 }),
    ];
    expect(pickRecordRunIds(tests).size).toBe(0);
  });

  it("ignores quotes", () => {
    const tests = [
      run({ lengthMode: "quote", durationOrWordCount: 25, wpm: 90 }),
      run({ lengthMode: "quote", durationOrWordCount: 25, wpm: 95 }),
    ];
    expect(pickRecordRunIds(tests).size).toBe(0);
  });

  it("buckets across modes, like the All view of Personal bests", () => {
    const race = run({ mode: "race", wpm: 215 });
    const adapt = run({ mode: "training", wpm: 286 });
    const reverse = run({ mode: "reverse_adaptive", wpm: 200 });
    expect([...pickRecordRunIds([race, adapt, reverse])]).toEqual([adapt.id]);
  });

  it("never crowns a 60-word run as the 60-second record", () => {
    const words = [
      run({ lengthMode: "words", durationOrWordCount: 60, wpm: 150 }),
      run({ lengthMode: "words", durationOrWordCount: 60, wpm: 140 }),
    ];
    const time = [
      run({ lengthMode: "time", durationOrWordCount: 60, wpm: 120 }),
      run({ lengthMode: "time", durationOrWordCount: 60, wpm: 110 }),
    ];
    // 60 words isn't a standard Words tile, so only the time run crowns.
    expect([...pickRecordRunIds([...words, ...time])]).toEqual([time[0].id]);
  });

  it("places legacy rows with no unit by their length", () => {
    const tests = [
      run({ lengthMode: null, durationOrWordCount: 30, wpm: 90 }),
      run({ lengthMode: null, durationOrWordCount: 30, wpm: 99 }),
    ];
    expect([...pickRecordRunIds(tests)]).toEqual([tests[1].id]);
  });

  it("skips the crown when an imported best beats every local run", () => {
    const tests = [run({ wpm: 100 }), run({ wpm: 110 })];
    const imported: PersonalBest = {
      mode: "casual",
      amount: 25,
      lengthMode: null,
      bestWpm: 140,
      bestAccuracy: 99,
      testsCount: 0,
    };
    const bests = [...derivePersonalBests(tests), imported];
    expect(pickRecordRunIds(tests, bests).size).toBe(0);
    // Without the import the local best still crowns.
    expect(pickRecordRunIds(tests, derivePersonalBests(tests)).size).toBe(1);
  });

  it("skips unfinished runs", () => {
    const tests = [run({ wpm: 200, wasCompleted: false }), run({ wpm: 100 })];
    expect(pickRecordRunIds(tests).size).toBe(0);
  });
});
