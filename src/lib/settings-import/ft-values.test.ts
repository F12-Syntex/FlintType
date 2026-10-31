import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "../hand-layout";
import { defaultLengthFor as appDefaultLength } from "@/app/_components/practice-words";
import { defaultLengthFor, fallbackLength, safeCssValue, validHandLayout, validLength } from "./ft-values";

describe("defaultLengthFor", () => {
  it("is the mode bar's own default length for every mode", () => {
    for (const mode of ["WORDS", "TIME", "QUOTE", "BURST"] as const) {
      expect([mode, defaultLengthFor(mode)]).toEqual([mode, appDefaultLength(mode)]);
    }
  });
});

describe("validLength", () => {
  it("takes a quote bracket 0 to 3 for quotes", () => {
    expect([0, 3].map((n) => validLength("QUOTE", n))).toEqual([0, 3]);
    for (const bad of [4, 25, -1, 1.5]) expect(validLength("QUOTE", bad)).toBeUndefined();
  });

  it("takes 1 to 1,000 for every other mode", () => {
    expect([validLength("WORDS", 1), validLength("TIME", 60.4), validLength("BURST", 5000)]).toEqual([1, 60, 1000]);
    expect(validLength("WORDS", 0)).toBeUndefined();
    expect(validLength("WORDS", "25")).toBeUndefined();
  });

  it("starts each mode on the mode bar's default", () => {
    expect(["WORDS", "TIME", "QUOTE", "BURST"].map(defaultLengthFor)).toEqual([25, 30, 1, 40]);
    for (const m of ["WORDS", "TIME", "QUOTE", "BURST"]) expect(validLength(m, defaultLengthFor(m))).toBeDefined();
  });
});

describe("fallbackLength", () => {
  it("keeps the stored length while the mode stays the same", () => {
    expect(fallbackLength("TIME", { mode: "TIME", length: 60 })).toBeUndefined();
    expect(fallbackLength("QUOTE", { mode: "QUOTE", length: 3 })).toBeUndefined();
  });

  it("starts a new mode on its default, never on another mode's length", () => {
    // A quote bracket of 2 would otherwise become a 2-second test.
    expect(fallbackLength("TIME", { mode: "QUOTE", length: 2 })).toBe(30);
    expect(fallbackLength("QUOTE", { mode: "WORDS", length: 25 })).toBe(1);
    expect(fallbackLength("WORDS", { mode: "QUOTE", length: 0 })).toBe(25);
  });

  it("repairs a stored length the mode can't run", () => {
    expect(fallbackLength("QUOTE", { mode: "QUOTE", length: 25 })).toBe(1);
    expect(fallbackLength("WORDS", {})).toBe(25);
  });

  it("always lands on a length the mode can run", () => {
    const modes = ["WORDS", "TIME", "QUOTE", "BURST"];
    for (const mode of modes) {
      for (const from of modes) {
        for (const length of [0, 2, 25, 5000, Number.NaN]) {
          const cur = { mode: from, length };
          const landed = fallbackLength(mode, cur) ?? cur.length;
          expect([mode, from, length, validLength(mode, landed)]).not.toContain(undefined);
        }
      }
    }
  });
});

describe("validHandLayout", () => {
  it("takes a complete, well-formed map", () => {
    expect(validHandLayout(DEFAULT_HAND_LAYOUT.fingers)).toEqual(DEFAULT_HAND_LAYOUT.fingers);
  });

  it("refuses a missing finger, a wrong type or a strange key name", () => {
    const { L5: _drop, ...missing } = DEFAULT_HAND_LAYOUT.fingers;
    void _drop;
    expect(validHandLayout(missing)).toBeUndefined();
    expect(validHandLayout({ ...DEFAULT_HAND_LAYOUT.fingers, L5: { enabled: "yes", homeKey: "KeyA" } })).toBeUndefined();
    expect(validHandLayout({ ...DEFAULT_HAND_LAYOUT.fingers, L5: { enabled: true, homeKey: "<b>" } })).toBeUndefined();
    expect(validHandLayout([])).toBeUndefined();
  });
});

describe("safeCssValue", () => {
  it("keeps one plain CSS token", () => {
    expect(safeCssValue(" #ff0000 ")).toBe("#ff0000");
    expect(safeCssValue('"Roboto Mono", monospace')).toBe('"Roboto Mono", monospace');
  });

  it("refuses anything that could escape the style or load something", () => {
    for (const bad of ["red; display:none", "url(x)", "a{}", "@import x", "expression(1)", "javascript:x", "", "x".repeat(201), 5]) {
      expect(safeCssValue(bad)).toBeUndefined();
    }
  });
});
