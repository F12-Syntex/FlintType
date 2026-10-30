import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import type { Gate, Habit, HabitKind, InsightsBucket } from "@/types/insights";
import { testKindOf } from "./copy-phrases";
import {
  HABIT_METHOD,
  HABIT_QUESTION,
  habitAnswer,
  habitEvidence,
  habitGate,
  PENDING_TITLE,
  testsTooShortForPace,
} from "./habit-copy";

const all: Habit[] = [
  { kind: "mistakeCost", costMs: 1200, costKeys: 6, noticeKeys: 1.6, n: 12 },
  { kind: "mistakeCost", costMs: 900, costKeys: 4, noticeKeys: 0.3, n: 12 },
  { kind: "mistakeCost", costMs: 15_000, costKeys: 1, noticeKeys: null, n: 12 },
  { kind: "longWords", answer: "yes-quite", longRate: 0.34, shortRate: 0.1, n: 400 },
  { kind: "longWords", answer: "a-little", longRate: 0.5, shortRate: 0.004, n: 400 },
  { kind: "longWords", answer: "not-really", longRate: 0.97, shortRate: 0.95, n: 400 },
  { kind: "paceToEnd", answer: "yes", slower: 4, of: 9, n: 9 },
  { kind: "paceToEnd", answer: "fade-a-little", slower: 8, of: 10, n: 10 },
  { kind: "paceToEnd", answer: "speed-up", slower: 1, of: 10, n: 10 },
  { kind: "warmUp", answer: "usually", wpm: 4, n: 9 },
  { kind: "warmUp", answer: "usually", wpm: null, n: 9 },
  { kind: "warmUp", answer: "not-really", wpm: null, n: 9 },
  { kind: "fatigue", answer: "after-20", accuracyDrop: 1.5, n: 7 },
  { kind: "fatigue", answer: "after-20", accuracyDrop: 1, n: 7 },
  { kind: "fatigue", answer: "not-that-we-can-see", accuracyDrop: null, n: 7 },
  { kind: "hands", answer: "even", ms: null, slowest: null, n: 900 },
  { kind: "hands", answer: "left-slower", ms: 14, slowest: { finger: "L5", keys: ["q", "a", "z"], ms: 30 }, n: 900 },
  { kind: "hands", answer: "right-slower", ms: 1400, slowest: null, n: 900 },
  { kind: "hands", answer: "unsupported", ms: null, slowest: null, n: 0 },
];

describe("habit answers and evidence", () => {
  it("gives the mistake cost as a figure, never a verdict", () => {
    expect(habitAnswer(all[0]!)).toBe("About 1.2 seconds each");
    expect(habitEvidence(all[0]!, "wpm")).toBe(
      "That's about as long as typing 6 letters at your pace. You usually notice one within 2 letters.",
    );
    expect(habitEvidence(all[1]!, "wpm")).toBe(
      "That's about as long as typing 4 letters at your pace. You usually notice one straight away.",
    );
    expect(habitEvidence(all[2]!, "wpm")).toBe("That's about as long as typing 1 letter at your pace.");
  });
  it("writes rates as shares of words", () => {
    expect(habitAnswer(all[3]!)).toBe("Yes, quite a bit");
    expect(habitEvidence(all[3]!, "wpm")).toBe("You pause before 1 in 3 long words, and 1 in 10 short ones.");
    expect(habitEvidence(all[4]!, "wpm")).toBe("You pause before about half your long words, and fewer than 1 in 100 short ones.");
    // Two shares that both mean half read alike, never "about half … and 1 in 2".
    const half: Habit = { kind: "longWords", answer: "a-little", longRate: 0.5, shortRate: 0.42, n: 400 };
    expect(habitEvidence(half, "wpm")).toBe("You pause before about half your long words, and about half your short ones.");
  });
  it("covers pace, warm-up, fatigue and hands", () => {
    expect(habitEvidence(all[7]!, "wpm")).toBe("In 8 of your last 10 longer tests, the last stretch was slower than the start.");
    expect(habitEvidence(all[9]!, "cpm")).toBe("Your first test averages about 20 cpm below your usual. One easy test first helps.");
    expect(habitEvidence(all[12]!, "wpm")).toBe("Past 20 minutes, your accuracy drops by about 1.5 points. A short break helps.");
    expect(habitEvidence(all[13]!, "wpm")).toBe("Past 20 minutes, your accuracy drops by about 1 point. A short break helps.");
    expect(habitAnswer(all[16]!)).toBe("Your left hand is a little slower");
    expect(habitEvidence(all[16]!, "wpm")).toBe(
      "Keys on your left hand land about 0.01 s later. Keys under your left pinky finger (q, a and z) are your slowest.",
    );
    expect(habitEvidence(all[17]!, "wpm")).toBe("Keys on your right hand land about 1.4 s later.");
    expect(habitAnswer(all[18]!)).toBe("We can't tell yet");
  });
  it("never prints a hand gap that rounds to zero", () => {
    for (const ms of [0, 1, 2, 3, 4]) {
      const h: Habit = { kind: "hands", answer: "left-slower", ms, slowest: null, n: 900 };
      expect(habitEvidence(h, "wpm")).toBe("Keys on your left hand land a little later, under 0.01 s a key.");
    }
    const h: Habit = { kind: "hands", answer: "right-slower", ms: 5, slowest: null, n: 900 };
    expect(habitEvidence(h, "wpm")).toBe("Keys on your right hand land about 0.01 s later.");
  });
  it("passes the copy rules in every branch", () => {
    for (const h of all) {
      expect(bannedPatterns(habitAnswer(h), { heading: true })).toEqual([]);
      expect(bannedPatterns(habitEvidence(h, "wpm")), habitEvidence(h, "wpm")).toEqual([]);
    }
    for (const k of Object.keys(HABIT_QUESTION) as HabitKind[]) {
      expect(bannedPatterns(HABIT_QUESTION[k])).toEqual([]);
      expect(bannedPatterns(HABIT_METHOD[k])).toEqual([]);
    }
    expect(bannedPatterns(PENDING_TITLE, { heading: true })).toEqual([]);
  });
});

const short = testKindOf({
  key: "casual|words|25", mode: "casual", lengthMode: "words", length: 25, touch: false, tests: 60, analysed: 60, lastAtMs: 0,
});

describe("habit gates", () => {
  const gate = (have: number, need: number, unit: Gate["unit"]): Gate => ({ have, need, unit });
  it("names each unit, in singular and plural", () => {
    expect(habitGate("warmUp", gate(4, 8, "tests"))).toBe("After 4 more tests.");
    expect(habitGate("warmUp", gate(7, 8, "tests"))).toBe("After 1 more test.");
    expect(habitGate("mistakeCost", gate(1, 3, "tests"))).toBe("After 2 more tests where you fix a mistake.");
    expect(habitGate("warmUp", gate(5, 8, "sessions"))).toBe("After 3 more sessions with 2 or more tests.");
    expect(habitGate("fatigue", gate(5, 6, "sessions"))).toBe("After 1 more session that runs past 20 minutes.");
    expect(habitGate("mistakeCost", gate(0, 12, "fixes"))).toBe("After 12 more fixed mistakes.");
    expect(habitGate("longWords", gate(90, 150, "gaps"))).toBe("After 60 more gaps between words.");
    expect(habitGate("longWords", gate(29, 30, "gaps"))).toBe("After 1 more gap before long words.");
    expect(habitGate("hands", gate(100, 300, "keys"))).toBe("After 200 more keys timed on a keyboard.");
    expect(habitGate("hands", gate(1, 3, "days"))).toBe("After 2 more days.");
  });
  it("counts only tests of 30 seconds or more for pace to the end", () => {
    expect(habitGate("paceToEnd", gate(4, 8, "tests"))).toBe("After 4 more tests of 30 seconds or more.");
    expect(habitGate("paceToEnd", gate(7, 8, "tests"))).toBe("After 1 more test of 30 seconds or more.");
    // Tests of this kind never run that long: say so once, with no count.
    expect(habitGate("paceToEnd", gate(0, 8, "tests"), { tooShort: short })).toBe(
      "Only tests of 30 seconds or more can show this. Your Casual tests of 25 words are shorter.",
    );
    // Some did run long enough, so the count can still move.
    expect(habitGate("paceToEnd", gate(2, 8, "tests"), { tooShort: short })).toBe(
      "After 6 more tests of 30 seconds or more.",
    );
  });
  it("passes the copy rules for every unit", () => {
    const units: Gate["unit"][] = ["tests", "sessions", "days", "fixes", "gaps", "keys"];
    for (const k of Object.keys(HABIT_QUESTION) as HabitKind[]) {
      for (const u of units) {
        for (const have of [0, 9, 29]) {
          for (const tooShort of [null, short]) {
            const g = habitGate(k, gate(have, 30, u), { tooShort });
            expect(bannedPatterns(g), g).toEqual([]);
          }
        }
      }
    }
  });
});

describe("tests too short for pace to the end", () => {
  const bucket = (lengthMode: InsightsBucket["lengthMode"], length: number): InsightsBucket => ({
    key: `casual|${lengthMode}|${length}`, mode: "casual", lengthMode, length, touch: false, tests: 60, analysed: 60, lastAtMs: 0,
  });
  it("reads timed tests by their length", () => {
    expect(testsTooShortForPace(bucket("time", 15), 80)).toBe(true);
    expect(testsTooShortForPace(bucket("time", 30), 80)).toBe(false);
    expect(testsTooShortForPace(bucket("time", 60), null)).toBe(false);
  });
  it("estimates a words test from the usual speed", () => {
    // 25 words at 220 wpm is about 7 seconds; at 45 wpm about 33.
    expect(testsTooShortForPace(bucket("words", 25), 220)).toBe(true);
    expect(testsTooShortForPace(bucket("words", 25), 45)).toBe(false);
    expect(testsTooShortForPace(bucket("words", 25), null)).toBe(false);
  });
  it("never calls quotes or an unknown bucket too short", () => {
    expect(testsTooShortForPace(bucket("quote", 0), 220)).toBe(false);
    expect(testsTooShortForPace(null, 220)).toBe(false);
  });
});
