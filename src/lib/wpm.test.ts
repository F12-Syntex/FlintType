import { describe, expect, it } from "vitest";
import { accuracyPercent, calcWpmAndRaw, countChars, errorCount } from "./wpm";

const MIN = 60_000; // one minute in ms

describe("errorCount (shared live + results error metric)", () => {
  it("is zero for a perfect run", () => {
    expect(errorCount(["hello", "world"], ["hello", "world"])).toBe(0);
  });

  it("counts per character, not per word", () => {
    // Three wrong letters in ONE word → 3, not 1. (The live readout used
    // to report per-word, the results per-keystroke; both now use this.)
    expect(errorCount(["hxllx", "wxrld"], ["hello", "world"])).toBe(3);
  });

  it("is zero once mistakes are corrected (final-buffer based)", () => {
    // The typed buffer ends up matching the target — corrected mistakes
    // don't linger, so it agrees with the 100%-accuracy reading.
    expect(errorCount(["hello", "world"], ["hello", "world"])).toBe(0);
  });

  it("counts extra characters as errors", () => {
    expect(errorCount(["helloo"], ["hello"])).toBe(1);
  });

  it("does NOT count a skipped (short) word's missing chars", () => {
    // A word skipped with space leaves missedChars, not incorrect — so a
    // pure skip contributes 0 errors in both the live and results views
    // (previously it bumped the live per-word count but not the results).
    expect(errorCount(["hel", "world"], ["hello", "world"])).toBe(0);
  });
});

describe("countChars", () => {
  it("counts a perfect two-word run", () => {
    const c = countChars(["hello", "world"], ["hello", "world"], true);
    expect(c.correctWordChars).toBe(10);
    expect(c.allCorrectChars).toBe(10);
    expect(c.incorrectChars).toBe(0);
    expect(c.extraChars).toBe(0);
    // one inter-word space, and it's correct (both words perfect)
    expect(c.spaces).toBe(1);
    expect(c.correctSpaces).toBe(1);
  });

  it("counts incorrect chars when a word is mistyped", () => {
    const c = countChars(["hzllo", "world"], ["hello", "world"], true);
    expect(c.incorrectChars).toBe(1);
    expect(c.allCorrectChars).toBe(9);
    expect(c.correctWordChars).toBe(5); // only "world" is perfect
  });

  it("counts extra chars typed past the word length", () => {
    const c = countChars(["helloxx"], ["hello"], true);
    expect(c.allCorrectChars).toBe(5);
    expect(c.extraChars).toBe(2);
  });
});

describe("accuracyPercent (missed chars count against accuracy, FT-033)", () => {
  it("is 100 for a fully-correct complete run", () => {
    expect(accuracyPercent(["hello", "world"], ["hello", "world"], true)).toBe(
      100,
    );
  });

  it("penalises a space-skipped word's missed tail (non-final word)", () => {
    // First word typed partially-correct ("th" of "the") then space-skipped,
    // so its untyped tail is a missedChar; second word perfect.
    // countChars: allCorrect = 2 + 3 = 5, missed = 1 → 5/6 * 100.
    const typed = ["th", "the"];
    const target = ["the", "the"];
    const c = countChars(typed, target, true);
    expect(c.allCorrectChars).toBe(5);
    expect(c.missedChars).toBe(1);
    expect(c.incorrectChars).toBe(0);
    expect(c.extraChars).toBe(0);
    const acc = accuracyPercent(typed, target, true);
    expect(acc).toBeLessThan(100);
    expect(acc).toBeCloseTo((5 / 6) * 100, 5);
  });

  it("is 100 when nothing countable was typed", () => {
    expect(accuracyPercent([""], ["hello"], true)).toBe(100);
    expect(accuracyPercent([], ["hello"], true)).toBe(100);
  });

  it("forgives the last word's untyped tail (timed-buzzer parity)", () => {
    // Fully-correct so far, last word still in progress, final=true, no
    // errors → its missing chars are NOT penalised.
    const typed = ["hello", "wor"];
    const target = ["hello", "world"];
    const c = countChars(typed, target, true);
    expect(c.missedChars).toBe(0);
    expect(c.incorrectChars).toBe(0);
    expect(accuracyPercent(typed, target, true)).toBe(100);
  });
});

describe("calcWpmAndRaw", () => {
  it("returns zeros for non-positive elapsed time", () => {
    expect(calcWpmAndRaw(["a"], ["a"], 0)).toEqual({ wpm: 0, raw: 0 });
    expect(calcWpmAndRaw(["a"], ["a"], -5)).toEqual({ wpm: 0, raw: 0 });
  });

  it("computes wpm/raw for a perfect run (raw === wpm)", () => {
    // "hello world" = 10 chars + 1 space = 11 units, over 1 minute, /5.
    const { wpm, raw } = calcWpmAndRaw(
      ["hello", "world"],
      ["hello", "world"],
      MIN,
      true,
    );
    expect(wpm).toBeCloseTo(11 / 5, 5);
    expect(raw).toBeCloseTo(11 / 5, 5);
    expect(raw).toBeGreaterThanOrEqual(wpm);
  });

  it("raw stays >= wpm on an inaccurate run (typed[]-derived)", () => {
    // First word fully wrong, second perfect.
    const { wpm, raw } = calcWpmAndRaw(
      ["xxxxx", "world"],
      ["hello", "world"],
      MIN,
      true,
    );
    expect(raw).toBeGreaterThan(wpm);
  });

  it("derives raw from the keystroke count when supplied", () => {
    // The user pressed 50 character keys but only one short word landed
    // in typed[] (the rest were rejected by stop-on-error). The
    // typed[]-derived raw would be tiny; the keystroke-derived raw must
    // reflect the 50 presses.
    const typed = ["h"]; // only one char survived into typed[]
    const target = ["hello"];
    const keystrokeRaw = calcWpmAndRaw(typed, target, MIN, true, 50).raw;
    const typedRaw = calcWpmAndRaw(typed, target, MIN, true).raw;
    expect(keystrokeRaw).toBeGreaterThan(typedRaw);
    // 50 keys / 5 chars-per-word over a minute = 10 wpm (no spaces here).
    expect(keystrokeRaw).toBeCloseTo(50 / 5, 5);
  });

  it("never reports raw 0 when keys were pressed but accuracy is ~0", () => {
    // Reproduces the reported bug: a fast garbage run. wpm (correct
    // words) is 0, but raw must reflect the keys hammered.
    const { wpm, raw } = calcWpmAndRaw([""], ["hello"], MIN, true, 80);
    expect(wpm).toBe(0);
    expect(raw).toBeGreaterThan(0);
    expect(raw).toBeCloseTo(80 / 5, 5);
  });
});
