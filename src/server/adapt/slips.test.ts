import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import type { KeystrokeTiming } from "@/types/adapt";
import {
  SLIP_COLD_REF_MS,
  SLIP_COST_DEFAULT_RATIO,
  SLIP_COST_MAX_RATIO,
  SLIP_COST_MIN_RATIO,
  extractSlips,
} from "./slips";

function k(
  t: number,
  expected: string,
  typed: string,
  correct: boolean,
  wordIndex = 0,
): KeystrokeTiming {
  return { t, expected, typed, correct, wordIndex };
}

const REF = 100;
const run = (timings: KeystrokeTiming[], ref = REF) =>
  extractSlips(timings, DEFAULT_HAND_LAYOUT, ref, new Array(timings.length).fill(false));

describe("extractSlips", () => {
  it("charges a fumbled pair the time until it was typed correctly", () => {
    // t ✓, h ✗ (typed g), [backspace], h ✓ at 600 → "th" cost 600ms.
    const s = run([
      k(0, "t", "t", true),
      k(120, "h", "g", false),
      k(600, "h", "h", true),
      k(720, "e", "e", true),
    ]);
    expect(s.bigrams.get("th")).toEqual([600]);
    expect(s.count).toBe(1);
    expect(s.bigrams.has("he")).toBe(false);
  });

  it("counts a cascade of wrong keys as one slip", () => {
    // Stop-on-error style: two blocked wrong presses, then the fix.
    const s = run([
      k(0, "t", "t", true),
      k(120, "h", "g", false),
      k(240, "h", "j", false),
      k(400, "h", "h", true),
    ]);
    expect(s.count).toBe(1);
    expect(s.bigrams.get("th")).toEqual([400]);
  });

  it("charges the default cost when the slip is never corrected", () => {
    const s = run([
      k(0, "t", "t", true),
      k(120, "h", "g", false),
      k(240, "e", "e", true),
    ]);
    expect(s.bigrams.get("th")).toEqual([SLIP_COST_DEFAULT_RATIO * REF]);
  });

  it("doesn't take a later identical letter as the fix of an unfixed slip", () => {
    // "thought" typed "tgought": the h at index 5 is the word's own
    // second h, not a correction of the slip at index 1.
    const word = "thought";
    const typed = "tgought";
    const s = run(
      [...word].map((ch, i) => k(i * 120, ch, typed[i]!, typed[i] === ch)),
    );
    expect(s.bigrams.get("th")).toEqual([SLIP_COST_DEFAULT_RATIO * REF]);
  });

  it("charges the default when the user moves to the next word", () => {
    const s = run([
      k(0, "t", "t", true, 0),
      k(120, "o", "p", false, 0),
      k(300, "o", "o", true, 1),
    ]);
    expect(s.bigrams.get("to")).toEqual([SLIP_COST_DEFAULT_RATIO * REF]);
  });

  it("clamps the cost into [MIN, MAX] × the reference", () => {
    const quick = run([
      k(0, "t", "t", true),
      k(30, "h", "g", false),
      k(60, "h", "h", true),
    ]);
    expect(quick.bigrams.get("th")).toEqual([SLIP_COST_MIN_RATIO * REF]);
    const paused = run([
      k(0, "t", "t", true),
      k(120, "h", "g", false),
      k(9_000, "h", "h", true),
    ]);
    expect(paused.bigrams.get("th")).toEqual([SLIP_COST_MAX_RATIO * REF]);
  });

  it("uses the cold reference when the user has no baseline yet", () => {
    const s = run(
      [k(0, "t", "t", true), k(120, "h", "g", false), k(240, "e", "e", true)],
      0,
    );
    expect(s.bigrams.get("th")).toEqual([SLIP_COST_DEFAULT_RATIO * SLIP_COLD_REF_MS]);
  });

  it("ignores a wrong first key of a word (no in-word predecessor)", () => {
    const s = run([
      k(0, "t", "t", true, 0),
      k(200, "a", "s", false, 1),
      k(400, "a", "a", true, 1),
    ]);
    expect(s.count).toBe(0);
  });

  it("ignores extra characters typed past the word end", () => {
    const s = run([k(0, "t", "t", true), k(120, "", "x", false)]);
    expect(s.count).toBe(0);
  });

  it("charges the slip to the pair's motor features too", () => {
    // 'a' → 'q' is a same-finger (L5) row jump.
    const s = run([
      k(0, "a", "a", true),
      k(120, "q", "w", false),
      k(500, "q", "q", true),
    ]);
    expect(s.motorFeatures.get("same_finger_L5")).toEqual([500]);
    expect(s.motorFeatures.get("row_jump_same_finger_L5")).toEqual([500]);
  });

  it("emits a trigram cost when the two preceding keys were clean", () => {
    const s = run([
      k(0, "t", "t", true),
      k(100, "h", "h", true),
      k(200, "e", "r", false),
      k(700, "e", "e", true),
    ]);
    // lead (t→h) 100ms + slip cost (h→e fixed at 700) 600ms.
    expect(s.trigrams.get("the")).toEqual([700]);
    expect(s.bigrams.get("he")).toEqual([600]);
  });

  it("skips the trigram when the middle key was itself a recovery", () => {
    const timings = [
      k(0, "t", "t", true),
      k(100, "h", "h", true),
      k(200, "e", "r", false),
    ];
    const tainted = [false, true, false];
    const s = extractSlips(timings, DEFAULT_HAND_LAYOUT, REF, tainted);
    expect(s.trigrams.size).toBe(0);
    expect(s.bigrams.has("he")).toBe(true);
  });

  it("is case-insensitive", () => {
    const s = run([
      k(0, "T", "T", true),
      k(120, "H", "G", false),
      k(500, "H", "H", true),
    ]);
    expect(s.bigrams.get("th")).toEqual([500]);
  });
});
