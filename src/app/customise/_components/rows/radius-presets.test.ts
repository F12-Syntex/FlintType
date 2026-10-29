import { describe, expect, it } from "vitest";
import { findTheme } from "@/lib/themes/registry";
import { paletteBaseline } from "@/lib/themes/palette-baseline";
import {
  activeRadiusPreset,
  paletteRadiusRem,
  radiusWrite,
  remOf,
  shownRadiusRem,
} from "./radius-presets";

describe("remOf", () => {
  it("reads rem, px and bare numbers", () => {
    expect(remOf("0.5rem")).toBe(0.5);
    expect(remOf("8px")).toBe(0.5);
    expect(remOf("0")).toBe(0);
    expect(remOf("0rem")).toBe(0);
  });

  it("gives undefined for unset or unreadable values", () => {
    expect(remOf(undefined)).toBeUndefined();
    expect(remOf("")).toBeUndefined();
    expect(remOf("round")).toBeUndefined();
  });
});

describe("paletteRadiusRem", () => {
  it("is the Default theme's 1rem with no palette", () => {
    expect(paletteRadiusRem(undefined)).toBe(1);
  });

  it("is the palette's own radius var", () => {
    expect(paletteRadiusRem(findTheme("amethyst-haze"))).toBe(0.5);
    expect(paletteRadiusRem(findTheme("catppuccin"))).toBe(0.35);
    expect(paletteRadiusRem(findTheme("claymorphism"))).toBe(1.25);
    expect(paletteRadiusRem(findTheme("light-green"))).toBe(1);
  });
});

describe("Corners row on the active palette", () => {
  it("marks no preset on a 0.5rem palette with no override", () => {
    const paletteRem = paletteRadiusRem(findTheme("amethyst-haze"));
    expect(activeRadiusPreset(shownRadiusRem(undefined, paletteRem))).toBeUndefined();
  });

  it("marks Round on Default with no override", () => {
    expect(activeRadiusPreset(shownRadiusRem(undefined, 1))).toBe("round");
  });

  it("marks the override's preset over the palette's radius", () => {
    expect(activeRadiusPreset(shownRadiusRem("0.625rem", 0.5))).toBe("soft");
  });

  it("writes 1rem for Round on a 0.5rem palette (no clear that does nothing)", () => {
    expect(
      radiusWrite(1, { paletteRem: 0.5, baselineOverride: undefined }),
    ).toEqual({ kind: "set", value: "1rem" });
  });

  it("clears the override when the palette already gives that radius", () => {
    expect(
      radiusWrite(1, { paletteRem: 1, baselineOverride: undefined }),
    ).toEqual({ kind: "clear" });
  });

  it("writes Round as 1rem on Claymorphism, not back to its 1.25rem radius", () => {
    const theme = findTheme("claymorphism");
    const ctx = {
      paletteRem: paletteRadiusRem(theme),
      baselineOverride: paletteBaseline(theme).themeOverrides["--radius"],
    };
    expect(ctx.baselineOverride).toBe("0.75rem");
    expect(radiusWrite(1, ctx)).toEqual({ kind: "set", value: "1rem" });
  });

  it("writes the palette preset's own value when picking it back", () => {
    const theme = findTheme("cyberpunk");
    const ctx = {
      paletteRem: paletteRadiusRem(theme),
      baselineOverride: paletteBaseline(theme).themeOverrides["--radius"],
    };
    expect(ctx.baselineOverride).toBe("0rem");
    expect(radiusWrite(0, ctx)).toEqual({ kind: "set", value: "0rem" });
    expect(radiusWrite(0.625, ctx)).toEqual({ kind: "set", value: "0.625rem" });
  });
});
