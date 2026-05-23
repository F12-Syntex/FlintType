import { describe, expect, it } from "vitest";
import { calcWpmAndRaw, countChars } from "./wpm";

const MIN = 60_000; // one minute in ms

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
