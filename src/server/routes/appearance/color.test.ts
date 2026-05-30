import { describe, expect, it } from "vitest";
import {
  buildPalette,
  DEFAULT_PALETTE_ROLES,
  formatOklch,
  hexToOklch,
  isDark,
  normalizeHarmony,
  parseColor,
  randomColorForVar,
} from "./color";

describe("parseColor", () => {
  it("parses oklch()", () => {
    const o = parseColor("oklch(0.65 0.2 35)");
    expect(o).not.toBeNull();
    expect(o!.l).toBeCloseTo(0.65, 2);
    expect(o!.c).toBeCloseTo(0.2, 2);
    expect(o!.h).toBeCloseTo(35, 1);
  });

  it("parses oklch with a percentage lightness", () => {
    const o = parseColor("oklch(62% 0.1 200)");
    expect(o!.l).toBeCloseTo(0.62, 2);
  });

  it("parses hex", () => {
    const white = parseColor("#ffffff");
    expect(white!.l).toBeGreaterThan(0.98);
    const black = parseColor("#000000");
    expect(black!.l).toBeLessThan(0.02);
  });

  it("parses shorthand hex", () => {
    expect(parseColor("#fff")!.l).toBeGreaterThan(0.98);
  });

  it("returns null for unsupported tokens", () => {
    expect(parseColor("rebeccapurple")).toBeNull();
    expect(parseColor("rgb(1,2,3)")).toBeNull();
    expect(parseColor("#zzz")).toBeNull();
  });
});

describe("hexToOklch — hue", () => {
  it("puts pure red near hue 29", () => {
    const o = hexToOklch("#ff0000")!;
    expect(o.h).toBeGreaterThan(20);
    expect(o.h).toBeLessThan(40);
    expect(o.c).toBeGreaterThan(0.1);
  });
});

describe("formatOklch", () => {
  it("rounds and wraps hue", () => {
    expect(formatOklch({ l: 0.6231, c: 0.2012, h: 370 })).toBe(
      "oklch(0.623 0.201 10)",
    );
  });
  it("clamps lightness and floors chroma", () => {
    expect(formatOklch({ l: 1.5, c: -0.2, h: 0 })).toBe("oklch(1 0 0)");
  });
});

describe("buildPalette", () => {
  const base = { l: 0.62, c: 0.2, h: 30 };

  it("fills every requested role with a valid oklch value", () => {
    const pal = buildPalette(base, "analogous", DEFAULT_PALETTE_ROLES, false);
    for (const role of DEFAULT_PALETTE_ROLES) {
      expect(pal[role]).toMatch(/^oklch\([\d.]+ [\d.]+ [\d.]+\)$/);
    }
  });

  it("keeps the base hue on neutrals and offsets the accent", () => {
    const pal = buildPalette(base, "complementary", ["--background", "--primary", "--accent"], false);
    expect(parseColor(pal["--background"])!.h).toBeCloseTo(30, 0);
    expect(parseColor(pal["--primary"])!.h).toBeCloseTo(30, 0);
    // accent takes the +180 complementary offset
    expect(parseColor(pal["--accent"])!.h).toBeCloseTo(210, 0);
  });

  it("uses the dark ramp when dark", () => {
    const light = buildPalette(base, "monochrome", ["--background"], false);
    const dark = buildPalette(base, "monochrome", ["--background"], true);
    expect(parseColor(light["--background"])!.l).toBeGreaterThan(0.8);
    expect(parseColor(dark["--background"])!.l).toBeLessThan(0.3);
  });

  it("skips roles with no template", () => {
    const pal = buildPalette(base, "analogous", ["--not-a-role"], false);
    expect(pal).toEqual({});
  });
});

describe("randomColorForVar", () => {
  it("returns a usable oklch in the var's lightness band", () => {
    const v = randomColorForVar("--background", false);
    const o = parseColor(v)!;
    expect(o.l).toBeGreaterThan(0.8);
  });
});

describe("isDark / normalizeHarmony", () => {
  it("detects a dark background", () => {
    expect(isDark("oklch(0.16 0.01 85)")).toBe(true);
    expect(isDark("oklch(0.95 0.01 85)")).toBe(false);
    expect(isDark(undefined)).toBe(false);
  });
  it("defaults unknown harmony to analogous", () => {
    expect(normalizeHarmony("nonsense")).toBe("analogous");
    expect(normalizeHarmony("triadic")).toBe("triadic");
  });
});
