import { describe, expect, it } from "vitest";
import { bestInk, contrast, luminance, mix, normaliseHex, reachContrast } from "./colour";

describe("colour helpers", () => {
  it("normalises short and long hex, and refuses the rest", () => {
    expect(normaliseHex(" #ABC ")).toBe("#aabbcc");
    expect(normaliseHex("#a1B2c3")).toBe("#a1b2c3");
    for (const bad of ["abc", "#abcd", "red", 5, null]) expect(normaliseHex(bad)).toBeNull();
  });

  it("measures WCAG luminance and contrast", () => {
    expect(luminance("#ffffff")).toBeCloseTo(1);
    expect(luminance("#000000")).toBe(0);
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21);
    expect(contrast("#777777", "#777777")).toBeCloseTo(1);
  });

  it("mixes toward another colour", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#123456", "#ffffff", 0)).toBe("#123456");
  });

  it("moves just far enough to reach a contrast", () => {
    const c = reachContrast("#444444", "#ffffff", ["#000000"], 4.5);
    expect(contrast(c, "#000000")).toBeGreaterThanOrEqual(4.5);
    expect(reachContrast("#000000", "#000000", ["#000000"], 4.5)).toBe("#000000");
  });

  it("picks black or white ink for a background", () => {
    expect(bestInk("#ffff00")).toBe("#000000");
    expect(bestInk("#101010")).toBe("#ffffff");
  });
});
