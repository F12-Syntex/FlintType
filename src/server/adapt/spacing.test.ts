import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "@/lib/hand-layout";
import {
  SPACING_DECAY,
  SPACING_FULL_DOSE,
  SPACING_MAX_OVERLAP,
  initialOverlaps,
  patternDose,
  patternKeysOf,
  spacingOverlap,
} from "./spacing";

describe("patternKeysOf", () => {
  it("lists each bigram and motor feature once", () => {
    const keys = patternKeysOf("aqa", DEFAULT_HAND_LAYOUT);
    expect(keys).toContain("b:aq");
    expect(keys).toContain("b:qa");
    expect(keys).toContain("f:same_finger_L5");
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("is empty for single characters", () => {
    expect(patternKeysOf("a", DEFAULT_HAND_LAYOUT)).toEqual([]);
  });
});

describe("patternDose", () => {
  it("sums carriers, decaying with tests ago", () => {
    const dose = patternDose(
      new Map([
        ["bring", 0],
        ["brown", 1],
        ["cat", 0],
      ]),
      DEFAULT_HAND_LAYOUT,
    );
    expect(dose.get("b:br")).toBeCloseTo(1 + SPACING_DECAY, 5);
    expect(dose.get("b:ca")).toBeCloseTo(1, 5);
    expect(dose.has("b:zz")).toBe(false);
  });

  it("is empty for an empty recency map", () => {
    expect(patternDose(new Map(), DEFAULT_HAND_LAYOUT).size).toBe(0);
  });
});

describe("spacingOverlap", () => {
  it("scales with dose up to the cap", () => {
    expect(spacingOverlap(0)).toBe(0);
    expect(spacingOverlap(SPACING_FULL_DOSE / 2)).toBeCloseTo(
      SPACING_MAX_OVERLAP / 2,
      5,
    );
    expect(spacingOverlap(SPACING_FULL_DOSE * 5)).toBe(SPACING_MAX_OVERLAP);
  });
});

describe("initialOverlaps", () => {
  it("keeps only dosed patterns some candidate carries", () => {
    const dose = new Map([
      ["b:br", SPACING_FULL_DOSE],
      ["b:zz", SPACING_FULL_DOSE],
    ]);
    const out = initialOverlaps(dose, [["b:br", "b:kx"], ["b:br"]]);
    expect([...out.keys()]).toEqual(["b:br"]);
    expect(out.get("b:br")).toBe(SPACING_MAX_OVERLAP);
  });
});
