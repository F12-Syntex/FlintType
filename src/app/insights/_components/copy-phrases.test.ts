import { describe, expect, it } from "vitest";
import type { InsightsBucket } from "@/types/insights";
import {
  aboutSeconds,
  cap,
  countOf,
  earlierRate,
  fixCostRose,
  moreOf,
  oneDecimal,
  ofEveryMinute,
  remaining,
  shareOf,
  speedDelta,
  testKindOf,
  worthPhrase,
} from "./copy-phrases";

const bucket = (o: Partial<InsightsBucket> = {}): InsightsBucket => ({
  key: "training|words|25",
  mode: "training",
  lengthMode: "words",
  length: 25,
  touch: false,
  tests: 12,
  analysed: 12,
  lastAtMs: 0,
  ...o,
});

describe("testKindOf", () => {
  it("names a bucket in singular and plural", () => {
    expect(testKindOf(bucket())).toEqual({ noun: "Adapt test of 25 words", group: "Adapt tests of 25 words" });
    expect(testKindOf(bucket({ mode: "race" }))).toEqual({ noun: "race of 25 words", group: "races of 25 words" });
    expect(testKindOf(bucket({ mode: "casual", lengthMode: "quote", length: 2 })).group).toBe(
      "Casual tests with long quotes",
    );
  });
  it("names the pooled view as every Adapt test", () => {
    expect(testKindOf(bucket({ key: "training|all", all: { kinds: 3, leftOut: 0 } }))).toEqual({
      noun: "Adapt test", group: "Adapt tests",
    });
  });
  it("adds the touch suffix to both forms", () => {
    const k = testKindOf(bucket({ touch: true }));
    expect(k.noun).toBe("Adapt test of 25 words on a touch screen");
    expect(k.group).toBe("Adapt tests of 25 words on a touch screen");
  });
  it("falls back to a generic name with no bucket", () => {
    expect(testKindOf(null)).toEqual({ noun: "test of the same kind", group: "tests of the same kind" });
  });
});

describe("counts", () => {
  const kind = testKindOf(bucket());
  it("counts what is left of a gate, at least 1", () => {
    expect(remaining({ have: 2, need: 5, unit: "tests" })).toBe(3);
    expect(remaining({ have: 5, need: 5, unit: "tests" })).toBe(1);
    expect(remaining({ have: 4.5, need: 5, unit: "tests" })).toBe(1);
  });
  it("uses the singular for one", () => {
    expect(moreOf(1, kind)).toBe("1 more Adapt test of 25 words");
    expect(moreOf(3, kind)).toBe("3 more Adapt tests of 25 words");
    expect(countOf(1, kind)).toBe("one Adapt test of 25 words");
    expect(countOf(30, kind)).toBe("30 Adapt tests of 25 words");
  });
});

describe("per-minute phrases", () => {
  it("never repeats 'a minute'", () => {
    expect(ofEveryMinute(4.5)).toBe("about 4.5 seconds of every minute");
    expect(ofEveryMinute(12)).toBe("about 12 seconds of every minute");
    expect(ofEveryMinute(0.3)).toBe("under half a second of every minute");
    expect(aboutSeconds(1.2)).toBe("about 1.2 seconds");
    expect(aboutSeconds(1)).toBe("about 1 second");
    expect(aboutSeconds(0.2)).toBe("under half a second");
  });
  it("never hedges under half a second, even for junk", () => {
    expect(ofEveryMinute(Number.NaN)).toBe("under half a second of every minute");
    expect(aboutSeconds(Number.NaN)).toBe("under half a second");
  });
  it("capitalises the first letter only", () => {
    expect(cap("about 4 seconds")).toBe("About 4 seconds");
    expect(cap("")).toBe("");
  });
});

describe("shareOf", () => {
  it("reads every rung of the ladder as a phrase", () => {
    expect(shareOf(0.2, "words")).toBe("about 1 in 5 words");
    expect(shareOf(0.5, "words")).toBe("about half your words");
    expect(shareOf(0.97, "words")).toBe("almost all your words");
    expect(shareOf(0.005, "words")).toBe("fewer than 1 in 100 words");
    expect(shareOf(0.66, "words")).toBe("about 2 in 3 words");
  });
});

describe("worthPhrase", () => {
  it("gives a range, one number, an upper bound or a floor", () => {
    expect(worthPhrase({ low: 3, high: 5 }, "wpm")).toBe("about 3 to 5 wpm");
    expect(worthPhrase({ low: 4, high: 4 }, "wpm")).toBe("about 4 wpm");
    expect(worthPhrase({ low: 0, high: 2 }, "wpm")).toBe("up to about 2 wpm");
    expect(worthPhrase({ low: 0, high: 0 }, "wpm")).toBe("less than 1 wpm");
    expect(worthPhrase({ low: 5, high: 3 }, "wpm")).toBe("about 3 to 5 wpm");
  });
  it("follows the speed unit", () => {
    expect(worthPhrase({ low: 3, high: 5 }, "cpm")).toBe("about 15 to 25 cpm");
    expect(speedDelta(-4, "wpm")).toBe("4 wpm");
  });
});

describe("mistake rates and costs", () => {
  it("writes the earlier rate without a zero figure", () => {
    expect(oneDecimal(1.25)).toBe("1.3");
    expect(earlierRate(0.8, { about: true })).toBe("about 0.8");
    expect(earlierRate(0.8, { about: false })).toBe("0.8");
    expect(earlierRate(0, { about: true })).toBe("almost none");
    expect(earlierRate(0.04, { about: false })).toBe("almost none");
  });
  it("calls a fix slower only when its cost rose", () => {
    expect(fixCostRose({ costKeys: [6, 4] })).toBe(true);
    expect(fixCostRose({ costKeys: [4, 4] })).toBe(false);
    expect(fixCostRose({ costKeys: [3, 5] })).toBe(false);
    expect(fixCostRose({})).toBe(false);
  });
});
