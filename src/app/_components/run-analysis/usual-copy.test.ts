import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import type { RangeSummary } from "@/types/insights";
import type { RunAnalysis } from "@/types/typing-analysis";
import {
  ADAPT_NOTE,
  COMPARE_HEADING,
  LOAD_ERROR,
  SIGN_IN_TAIL,
  learningLine,
  rangeLabel,
  rangePhrase,
  referenceLine,
  sliceLineFor,
  sliceLines,
} from "./usual-copy";

const range = (low: number, high: number): RangeSummary => ({ low, mid: (low + high) / 2, high, n: 30, rule: "middle-80" });
const wpm = (n: number) => `${Math.round(n)} wpm`;
const pct = (n: number) => `${Math.round(n * 10) / 10}%`;
const sentences: string[] = [];
const keep = (s: string) => (sentences.push(s), s);

describe("referenceLine", () => {
  it("names the tests compared against", () => {
    expect(keep(referenceLine({ kind: "usual", n: 30 }, "Adapt tests of 25 words"))).toBe(
      "Against your previous 30 Adapt tests of 25 words.",
    );
    expect(keep(referenceLine({ kind: "earlier-today", n: 6 }, "Casual tests of 60 seconds"))).toBe(
      "Against your 6 earlier Casual tests of 60 seconds today.",
    );
  });
});

describe("rangePhrase", () => {
  it("inside, above and below; the ends count as inside", () => {
    const r = range(70, 80);
    expect(rangePhrase(75, r)).toBe("Inside your usual range");
    expect(rangePhrase(70, r)).toBe("Inside your usual range");
    expect(rangePhrase(80, r)).toBe("Inside your usual range");
    expect(rangePhrase(80.1, r)).toBe("Above your usual range");
    expect(rangePhrase(69, r)).toBe("Below your usual range");
  });
});

describe("rangeLabel", () => {
  it("a range, for speed and for accuracy", () => {
    expect(keep(rangeLabel("speed", range(77.2, 81.4), 79, wpm))).toBe(
      "Your usual speed is between 77 wpm and 81 wpm, and this test was 79 wpm.",
    );
    expect(keep(rangeLabel("accuracy", range(96.2, 98.1), 97, pct))).toBe(
      "Your usual accuracy is between 96.2% and 98.1%, and this test was 97%.",
    );
  });
  it("one number when both ends print alike", () => {
    expect(keep(rangeLabel("speed", { low: 79.6, mid: 80, high: 80.3, n: 5, rule: "min-max" }, 84, wpm))).toBe(
      "Your usual speed is about 80 wpm, and this test was 84 wpm.",
    );
    expect(keep(rangeLabel("accuracy", { low: 97.61, mid: 97.62, high: 97.64, n: 5, rule: "min-max" }, 95.8, pct))).toBe(
      "Your usual accuracy is about 97.6%, and this test was 95.8%.",
    );
  });
  it("decides on the printed figures, not on whole numbers", () => {
    // Both ends round to 98, but the track prints "97.6%" and "98.3%".
    expect(keep(rangeLabel("accuracy", range(97.6, 98.3), 95.8, pct))).toBe(
      "Your usual accuracy is between 97.6% and 98.3%, and this test was 95.8%.",
    );
    const wpm1 = (n: number) => `${(Math.round(n * 10) / 10).toFixed(1)} wpm`;
    expect(keep(rangeLabel("speed", range(79.6, 80.3), 84, wpm1))).toBe(
      "Your usual speed is between 79.6 wpm and 80.3 wpm, and this test was 84.0 wpm.",
    );
  });
});

describe("learningLine", () => {
  it("k = 1 uses the singular noun, k = 2 the group", () => {
    expect(keep(learningLine({ have: 4, need: 5, unit: "tests" }, "Adapt test of 25 words", "Adapt tests of 25 words"))).toBe(
      "After 1 more Adapt test of 25 words you'll see how this test compares with your usual.",
    );
    expect(keep(learningLine({ have: 3, need: 5, unit: "tests" }, "Adapt test of 25 words", "Adapt tests of 25 words"))).toBe(
      "After 2 more Adapt tests of 25 words you'll see how this test compares with your usual.",
    );
  });
  it("never asks for zero or fewer", () => {
    expect(learningLine({ have: 5, need: 5, unit: "tests" }, "race of 25 words", "races of 25 words")).toBe(
      "After 1 more race of 25 words you'll see how this test compares with your usual.",
    );
  });
});

describe("sliceLines", () => {
  it("names the part and both figures", () => {
    const l = sliceLines("before", 6.24, 3.1);
    expect(keep(l.lead)).toBe("Pauses before words took 6.2 seconds a minute in this test.");
    expect(keep(l.follow)).toBe("Usually it takes 3.1 seconds a minute.");
    expect(keep(sliceLines("fixing", 0.2, 2).lead)).toBe("Fixing mistakes took under half a second a minute in this test.");
    expect(keep(sliceLines("inside", 2, 4).lead)).toBe("Hesitations inside words took 2 seconds a minute in this test.");
  });
});

describe("sliceLineFor", () => {
  const analysis: Pick<RunAnalysis, "perMinute" | "pace" | "quality" | "T"> = {
    perMinute: { typing: 50, fixing: 4, before: 3, inside: 2, breaks: 1 },
    pace: { P: 150, sigma: 0.2, catchFactor: 1.8, boundaryMs: 360, pauseFactor: 1.8, breakMs: 3000, intervals: 40 },
    quality: { capture: 2, replayOk: true, pace: "good", quantised: false, clockOk: true, partial: false, qwerty: true },
    T: 20_000,
  };
  const usual = { fixing: 1, before: 2.5, inside: 2.1 };
  it("picks the part that differs most, from 1.5 s a minute", () => {
    expect(sliceLineFor({ analysis, usual, fixMode: "fix" })).toEqual({ key: "fixing", thisPerMin: 4, usualPerMin: 1 });
    expect(sliceLineFor({ analysis, usual: { fixing: 3, before: 2.5, inside: 2 }, fixMode: "fix" })).toBeNull();
  });
  it("skips Fixing with backspace off", () => {
    expect(sliceLineFor({ analysis, usual, fixMode: "none" })).toBeNull();
    expect(sliceLineFor({ analysis, usual: { ...usual, before: 0.5 }, fixMode: "none" })?.key).toBe("before");
  });
  it("needs a whole, well-paced test of 10 s or more and a usual", () => {
    expect(sliceLineFor({ analysis, usual: null, fixMode: "fix" })).toBeNull();
    expect(sliceLineFor({ analysis: { ...analysis, perMinute: null }, usual, fixMode: "fix" })).toBeNull();
    expect(sliceLineFor({ analysis: { ...analysis, pace: null }, usual, fixMode: "fix" })).toBeNull();
    expect(sliceLineFor({ analysis: { ...analysis, pace: { ...analysis.pace!, intervals: 14 } }, usual, fixMode: "fix" })).toBeNull();
    expect(sliceLineFor({ analysis: { ...analysis, quality: { ...analysis.quality, partial: true } }, usual, fixMode: "fix" })).toBeNull();
    expect(sliceLineFor({ analysis: { ...analysis, T: 9_999 }, usual, fixMode: "fix" })).toBeNull();
  });
});

describe("I11", () => {
  it("every sentence passes the copy rules; labels pass as headings", () => {
    sentences.push(ADAPT_NOTE, LOAD_ERROR, `Sign in${SIGN_IN_TAIL}`);
    expect(sentences.length).toBeGreaterThan(12);
    for (const s of sentences) expect(bannedPatterns(s), s).toEqual([]);
    for (const label of [COMPARE_HEADING, "Inside your usual range", "Above your usual range", "Below your usual range"]) {
      expect(bannedPatterns(label, { heading: true }), label).toEqual([]);
    }
  });
});
