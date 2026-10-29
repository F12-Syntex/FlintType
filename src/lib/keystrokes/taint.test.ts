import { describe, expect, it } from "vitest";
import type { KeystrokeTiming } from "@/types/adapt";
import { MIN_INTERVAL_MS, computeTaintMask } from "./taint";

function k(correct: boolean, wordIndex = 0, t = 0): KeystrokeTiming {
  return { t, expected: "a", typed: correct ? "a" : "s", correct, wordIndex };
}

describe("computeTaintMask", () => {
  it("is all clean for a clean stream", () => {
    expect(computeTaintMask([k(true), k(true), k(true, 1)])).toEqual([false, false, false]);
  });

  it("taints a wrong key and the first correct key after it", () => {
    expect(computeTaintMask([k(true), k(false), k(true), k(true)])).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it("taints every wrong key in a cascade, then one recovery key", () => {
    expect(computeTaintMask([k(true), k(false), k(false), k(true), k(true)])).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
  });

  it("doesn't carry recovery across a word boundary", () => {
    // The wrong last key of word 0 never got its recovery key; the first
    // key of word 1 is a fresh start, not a recovery.
    expect(computeTaintMask([k(true, 0), k(false, 0), k(true, 1), k(true, 1)])).toEqual([
      false,
      true,
      false,
      false,
    ]);
  });

  it("is empty for an empty stream", () => {
    expect(computeTaintMask([])).toEqual([]);
  });
});

describe("MIN_INTERVAL_MS", () => {
  it("is the 25 ms floor below which an interval is a paste or repeat", () => {
    expect(MIN_INTERVAL_MS).toBe(25);
  });
});
