import { describe, expect, it } from "vitest";
import { paletteBaseline } from "@/lib/themes/palette-baseline";
import { findTheme } from "@/lib/themes/registry";
import type { AppearancePatch } from "@/types/appearance-ai";
import { paletteRadiusRem } from "../../../_components/rows/radius-presets";
import { settleRadius } from "./settle-radius";

function patchWith(theme: Record<string, string>): AppearancePatch {
  return {
    theme,
    appearance: { depth: "flat" },
    background: {},
    behaviour: {},
  };
}

function paletteOf(id: string | null) {
  const theme = findTheme(id);
  return {
    paletteRem: paletteRadiusRem(theme),
    baselineOverride: paletteBaseline(theme).themeOverrides["--radius"],
  };
}

describe("settleRadius", () => {
  it("turns Round on Default into a clear instead of a 1rem override", () => {
    const patch = patchWith({ "--radius": "1rem", "--primary": "red" });
    const out = settleRadius(patch, paletteOf(null));
    expect(out.clearRadius).toBe(true);
    expect(out.patch.theme).toEqual({ "--primary": "red" });
    // The rest of the patch is untouched.
    expect(out.patch.appearance).toEqual({ depth: "flat" });
    // Never mutates the input patch.
    expect(patch.theme["--radius"]).toBe("1rem");
  });

  it("keeps a pick the palette doesn't already give", () => {
    const patch = patchWith({ "--radius": "0.625rem" });
    const out = settleRadius(patch, paletteOf(null));
    expect(out).toEqual({ patch, clearRadius: false });
    expect(out.patch).toBe(patch);
  });

  it("writes Round as 1rem on a 0.5rem palette", () => {
    const patch = patchWith({ "--radius": "1rem" });
    const out = settleRadius(patch, paletteOf("amethyst-haze"));
    expect(out.clearRadius).toBe(false);
    expect(out.patch.theme["--radius"]).toBe("1rem");
  });

  it("clears on a palette whose own radius is the pick", () => {
    const out = settleRadius(patchWith({ "--radius": "1rem" }), paletteOf("light-green"));
    expect(out.clearRadius).toBe(true);
    expect(out.patch.theme).toEqual({});
  });

  it("writes the palette preset's own value when the pick matches it", () => {
    const palette = { paletteRem: 0.5, baselineOverride: "0px" };
    const out = settleRadius(patchWith({ "--radius": "0rem" }), palette);
    expect(out.clearRadius).toBe(false);
    expect(out.patch.theme["--radius"]).toBe("0px");
  });

  it("leaves a patch without a radius alone", () => {
    const patch = patchWith({ "--primary": "red" });
    expect(settleRadius(patch, paletteOf(null))).toEqual({
      patch,
      clearRadius: false,
    });
    expect(settleRadius(patch, paletteOf(null)).patch).toBe(patch);
  });
});
