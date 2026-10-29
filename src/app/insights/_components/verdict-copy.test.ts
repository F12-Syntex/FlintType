import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import type { RangeSummary, SpeedHeadline } from "@/types/insights";
import { testKindOf } from "./copy-phrases";
import { rangeSentence, rangeTrackLabel, speedLabel } from "./verdict-copy";

const kind = testKindOf({
  key: "training|words|25", mode: "training", lengthMode: "words", length: 25, touch: false,
  tests: 40, analysed: 40, lastAtMs: 0,
});
const range = (low: number, high: number, rule: RangeSummary["rule"], n = 30): RangeSummary => ({
  low, mid: (low + high) / 2, high, n, rule,
});
const headline = (r: RangeSummary | null, last = 70.4): SpeedHeadline => ({
  usual: 72, range: r, last, adjusted: false,
  trend: { state: "steady", deltaWpm: null, earlierN: 20, sinceMs: null, weeks: null, explanation: null, gate: null },
});

describe("speed label", () => {
  it("names the hero by state", () => {
    expect(speedLabel(true)).toBe("Your usual speed");
    expect(speedLabel(false)).toBe("Your last test");
  });
});

describe("range sentence", () => {
  it("gives the middle of the usual range, and the last test with its unit", () => {
    expect(rangeSentence(headline(range(66.2, 79.4, "middle-80")), "wpm", kind, 30)).toBe(
      "Most of your tests land between 66 and 79 wpm. Your last one was 70 wpm.",
    );
    expect(rangeSentence(headline(range(66.2, 79.4, "middle-80")), "cps", kind, 30)).toBe(
      "Most of your tests land between 5.52 and 6.62 cps. Your last one was 5.87 cps.",
    );
  });
  it("gives the whole spread of a short window", () => {
    expect(rangeSentence(headline(range(60.4, 75, "min-max", 6)), "wpm", kind, 6)).toBe(
      "Your last 6 tests ranged from 60 to 75 wpm.",
    );
  });
  it("reads one figure when both ends round alike", () => {
    expect(rangeSentence(headline(range(66.2, 66.4, "min-max", 5)), "wpm", kind, 5)).toBe(
      "Your last 5 tests were all about 66 wpm.",
    );
    expect(rangeSentence(headline(range(71.6, 72.4, "middle-80")), "wpm", kind, 30)).toBe(
      "Most of your tests land at about 72 wpm. Your last one was 70 wpm.",
    );
  });
  it("counts the tests left before there is a range", () => {
    expect(rangeSentence(headline(null), "wpm", kind, 1)).toBe("4 more Adapt tests of 25 words to see your usual range.");
    expect(rangeSentence(headline(null), "wpm", kind, 4)).toBe("1 more Adapt test of 25 words to see your usual range.");
  });
});

describe("range track label", () => {
  it("reads the range and the last test", () => {
    expect(rangeTrackLabel(headline(range(66.2, 79.4, "middle-80")), "wpm")).toBe(
      "Usual range 66 to 79 wpm. Your last test 70 wpm.",
    );
    expect(rangeTrackLabel(headline(range(66.2, 66.4, "min-max", 5)), "wpm")).toBe(
      "Usual range about 66 wpm. Your last test 70 wpm.",
    );
    expect(rangeTrackLabel(headline(null), "wpm")).toBe("Your last test 70 wpm.");
  });
});

describe("copy rules", () => {
  it("holds in every branch", () => {
    const ranges = [null, range(60, 80, "middle-80"), range(66.2, 66.4, "min-max", 5), range(60, 75, "min-max", 6)];
    for (const unit of ["wpm", "cpm", "cps"] as const) {
      for (const r of ranges) {
        for (const k of [kind, testKindOf(null)]) {
          for (const tests of [1, 4, 30]) {
            const s = rangeSentence(headline(r), unit, k, tests);
            expect(bannedPatterns(s), s).toEqual([]);
          }
        }
        const l = rangeTrackLabel(headline(r), unit);
        expect(bannedPatterns(l), l).toEqual([]);
      }
    }
    for (const ready of [true, false]) expect(bannedPatterns(speedLabel(ready), { heading: true })).toEqual([]);
  });
});
