import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import type { KeystrokeTiming } from "@/types/adapt";
import {
  ABSOLUTE_PAUSE_MS,
  MAX_INTERVAL_RATIO,
  MIN_INTERVAL_MS,
  extract,
} from "./measure";

const EMPTY_BASELINES = {
  bigram: new Map<string, number>(),
  trigram: new Map<string, number>(),
};

function k(
  t: number,
  expected: string,
  typed: string,
  correct: boolean,
  wordIndex = 0,
): KeystrokeTiming {
  return { t, expected, typed, correct, wordIndex };
}

describe("measure.extract", () => {
  it("emits bigram samples for consecutive correct chars in a word", () => {
    const timings = [
      k(0, "t", "t", true),
      k(120, "h", "h", true),
      k(240, "e", "e", true),
    ];
    const m = extract(timings, DEFAULT_HAND_LAYOUT, EMPTY_BASELINES);
    expect(m.bigrams.get("th")).toEqual([120]);
    expect(m.bigrams.get("he")).toEqual([120]);
    expect(m.accepted).toBe(2);
  });

  it("emits trigram samples once three correct chars line up", () => {
    const timings = [
      k(0, "t", "t", true),
      k(120, "h", "h", true),
      k(240, "e", "e", true),
    ];
    const m = extract(timings, DEFAULT_HAND_LAYOUT, EMPTY_BASELINES);
    expect(m.trigrams.get("the")).toEqual([240]);
  });

  it("drops bigrams that span a word boundary", () => {
    const timings = [
      k(0, "t", "t", true, 0),
      k(120, "h", "h", true, 0),
      k(240, "e", "e", true, 0),
      k(400, "a", "a", true, 1),
      k(520, "n", "n", true, 1),
    ];
    const m = extract(timings, DEFAULT_HAND_LAYOUT, EMPTY_BASELINES);
    expect(m.bigrams.has("ea")).toBe(false);
    expect(m.bigrams.get("an")).toEqual([120]);
  });

  it("drops a sample where either end was wrong", () => {
    const timings = [
      k(0, "t", "t", true),
      k(120, "h", "g", false),
      k(240, "e", "e", true),
    ];
    const m = extract(timings, DEFAULT_HAND_LAYOUT, EMPTY_BASELINES);
    expect(m.bigrams.has("th")).toBe(false);
    expect(m.bigrams.has("he")).toBe(false);
  });

  it("drops the first correct keystroke after an error (recovery key)", () => {
    const timings = [
      k(0, "t", "t", true),
      k(120, "h", "g", false), // error
      k(700, "h", "h", true), // recovery — tainted
      k(820, "e", "e", true),
    ];
    const m = extract(timings, DEFAULT_HAND_LAYOUT, EMPTY_BASELINES);
    // 'h' is the recovery key — bigram involving it is dropped.
    expect(m.bigrams.has("he")).toBe(false);
    // 'th' bigram crosses the error keystroke too.
    expect(m.bigrams.has("th")).toBe(false);
  });

  it("rejects samples below MIN_INTERVAL_MS as paste artifacts", () => {
    const timings = [
      k(0, "t", "t", true),
      k(MIN_INTERVAL_MS - 5, "h", "h", true),
    ];
    const m = extract(timings, DEFAULT_HAND_LAYOUT, EMPTY_BASELINES);
    expect(m.bigrams.has("th")).toBe(false);
    expect(m.rejected).toBeGreaterThan(0);
  });

  it("rejects samples > MAX_INTERVAL_RATIO × baseline as user pauses", () => {
    const baselines = {
      bigram: new Map([["th", 120]]),
      trigram: new Map<string, number>(),
    };
    const timings = [
      k(0, "t", "t", true),
      k(120 * MAX_INTERVAL_RATIO + 10, "h", "h", true),
    ];
    const m = extract(timings, DEFAULT_HAND_LAYOUT, baselines);
    expect(m.bigrams.has("th")).toBe(false);
    expect(m.rejected).toBe(1);
  });

  it("falls back to ABSOLUTE_PAUSE_MS when no baseline exists", () => {
    const tooSlow = ABSOLUTE_PAUSE_MS * MAX_INTERVAL_RATIO + 10;
    const timings = [
      k(0, "t", "t", true),
      k(tooSlow, "h", "h", true),
    ];
    const m = extract(timings, DEFAULT_HAND_LAYOUT, EMPTY_BASELINES);
    expect(m.bigrams.has("th")).toBe(false);
  });

  it("emits motor-feature samples for each accepted bigram", () => {
    // 'a' (L5) and 'q' (L5) — same finger, row jump — emits multiple
    // features in addition to the bigram itself.
    const timings = [k(0, "a", "a", true), k(120, "q", "q", true)];
    const m = extract(timings, DEFAULT_HAND_LAYOUT, EMPTY_BASELINES);
    expect(m.motorFeatures.get("same_finger_L5")).toEqual([120]);
    expect(m.motorFeatures.get("row_jump_same_finger_L5")).toEqual([120]);
  });

  it("skips motor features when bigram chars are unmapped", () => {
    const timings = [k(0, "1", "1", true), k(120, "a", "a", true)];
    const m = extract(timings, DEFAULT_HAND_LAYOUT, EMPTY_BASELINES);
    // bigram "1a" is recorded — the bigram model doesn't care about
    // the finger map — but no motor features are emitted.
    expect(m.motorFeatures.size).toBe(0);
  });

  it("counts accepted and rejected correctly", () => {
    const timings = [
      k(0, "t", "t", true),
      k(120, "h", "h", true), // accept (th)
      k(125, "e", "e", true), // reject (< MIN_INTERVAL_MS from prev)
      k(245, "r", "r", true), // accept (er)
    ];
    const m = extract(timings, DEFAULT_HAND_LAYOUT, EMPTY_BASELINES);
    expect(m.accepted).toBe(2);
    expect(m.rejected).toBe(1);
  });
});
