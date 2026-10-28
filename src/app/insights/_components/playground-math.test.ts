import { describe, expect, it } from "vitest";
import {
  isChallengeWord,
  predictedWordWpm,
  summarisePlayground,
  tokenisePlayground,
  transitionsIn,
} from "./playground-math";

describe("transitionsIn", () => {
  it("counts letter-to-letter transitions", () => {
    expect(transitionsIn("the")).toBe(2);
    expect(transitionsIn("a")).toBe(0);
    expect(transitionsIn("")).toBe(0);
  });
});

describe("predictedWordWpm", () => {
  it("treats predictedMs as the whole word's time, not per keystroke", () => {
    // "the" = 2 transitions at 100ms each = 200ms total → 120 WPM.
    expect(predictedWordWpm("the", 200)).toBeCloseTo(120);
    // "quick" = 4 transitions at 100ms = 400ms → still 120 WPM.
    expect(predictedWordWpm("quick", 400)).toBeCloseTo(120);
  });

  it("returns null when there is nothing to predict", () => {
    expect(predictedWordWpm("a", 0)).toBeNull();
    expect(predictedWordWpm("the", 0)).toBeNull();
  });
});

describe("isChallengeWord", () => {
  const banded = { predictedMs: 300, inChallengeBand: true };
  it("only paints when the band is active", () => {
    expect(isChallengeWord("the", banded, true)).toBe(true);
    expect(isChallengeWord("the", banded, false)).toBe(false);
  });
  it("never paints one-letter words (the server flags them by default)", () => {
    expect(isChallengeWord("a", { predictedMs: 0, inChallengeBand: true }, true)).toBe(false);
  });
  it("respects the server's band verdict", () => {
    expect(isChallengeWord("the", { predictedMs: 200, inChallengeBand: false }, true)).toBe(false);
  });
});

describe("summarisePlayground", () => {
  it("agrees with the per-word chips", () => {
    const scores = {
      the: { predictedMs: 200, inChallengeBand: false }, // 120 wpm
      quick: { predictedMs: 400, inChallengeBand: true }, // 120 wpm
    };
    const s = summarisePlayground(["the", "quick"], scores, true);
    expect(s.scored).toBe(2);
    expect(s.challenge).toBe(1);
    expect(s.predictedWpm).toBeCloseTo(120);
  });

  it("weights the mean by transitions (harmonic, like real typing time)", () => {
    const scores = {
      ab: { predictedMs: 100, inChallengeBand: false }, // 1 t @ 100ms → 120
      abcde: { predictedMs: 800, inChallengeBand: false }, // 4 t @ 200ms → 60
    };
    // 5 transitions over 900ms → 12000·5/900 ≈ 66.7
    const s = summarisePlayground(["ab", "abcde"], scores, true);
    expect(s.predictedWpm).toBeCloseTo((12_000 * 5) / 900);
  });

  it("counts repeated words once per occurrence and skips unscored ones", () => {
    const scores = { the: { predictedMs: 200, inChallengeBand: true } };
    const s = summarisePlayground(["the", "fox", "the"], scores, true);
    expect(s.scored).toBe(2);
    expect(s.challenge).toBe(2);
  });

  it("returns a null prediction when nothing has a transition", () => {
    const scores = { a: { predictedMs: 0, inChallengeBand: true } };
    const s = summarisePlayground(["a"], scores, true);
    expect(s.predictedWpm).toBeNull();
    expect(s.challenge).toBe(0);
  });

  it("paints nothing while the band is inactive (cold model)", () => {
    const scores = { the: { predictedMs: 200, inChallengeBand: true } };
    expect(summarisePlayground(["the"], scores, false).challenge).toBe(0);
  });
});

describe("tokenisePlayground", () => {
  it("lowercases, strips punctuation and drops empties", () => {
    expect(tokenisePlayground("The quick, brown fox! 123")).toEqual([
      "the",
      "quick",
      "brown",
      "fox",
    ]);
  });
  it("keeps apostrophes and caps the word count", () => {
    expect(tokenisePlayground("don't stop")).toEqual(["don't", "stop"]);
    expect(tokenisePlayground("a b c d", 2)).toEqual(["a", "b"]);
  });
});
