import { describe, expect, it } from "vitest";
import {
  calcWpmAndRaw,
  countChars,
  errorCount,
  keystrokeAccuracy,
  keystrokeErrors,
} from "./wpm";

const ev = (...correct: boolean[]) => correct.map((c) => ({ correct: c }));

describe("keystrokeAccuracy / keystrokeErrors (keystroke-true practice stats)", () => {
  it("is 100% / 0 errors for an empty stream", () => {
    expect(keystrokeAccuracy([])).toBe(100);
    expect(keystrokeErrors([])).toBe(0);
  });

  it("is 100% / 0 errors when every keystroke is correct", () => {
    const e = ev(true, true, true, true, true);
    expect(keystrokeAccuracy(e)).toBe(100);
    expect(keystrokeErrors(e)).toBe(0);
  });

  it("computes the keystroke ratio for a mix (2 of 5 wrong → 60% / 2)", () => {
    const e = ev(true, false, true, false, true);
    expect(keystrokeAccuracy(e)).toBeCloseTo(60, 5);
    expect(keystrokeErrors(e)).toBe(2);
  });

  it("still counts a CORRECTED mistake (a false event before later correct ones)", () => {
    // Repro of the bug: type wrong, then (after a backspace) type the
    // rest correctly. The wrong keystroke was recorded as a false event
    // before the correction, so it must still drag accuracy down.
    const e = ev(false, true, true, true, true); // 'qqqqq'→backspace→correct
    expect(keystrokeAccuracy(e)).toBeCloseTo(80, 5);
    expect(keystrokeErrors(e)).toBe(1);
  });
});

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

  it("counts a skipped (short) word's missing chars as errors", () => {
    // A word skipped with space leaves missedChars — issue #17b: the
    // skip underlines as an error live, so the error stat counts the
    // untyped tail too, identically live (final=false) and on results.
    expect(errorCount(["hel", "world"], ["hello", "world"], true)).toBe(2);
    expect(errorCount(["hel", "world"], ["hello", "world"], false)).toBe(2);
  });

  it("does not penalise the word currently being typed (live)", () => {
    // The in-progress word is the last typed entry — with final=false its
    // untyped tail is not missed yet, so live ERR stays quiet mid-word.
    expect(errorCount(["hel"], ["hello", "world"], false)).toBe(0);
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
