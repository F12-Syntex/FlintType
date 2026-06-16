import { describe, expect, it } from "vitest";
import {
  forkPaletteToCustom,
  type PaletteBase,
  paletteAfterReset,
  type PaletteSlice,
} from "./palette-fork";
import { CUSTOM_THEME_ID } from "./registry";

const CUSTOM = "custom";

// The pre-hydration script in src/lib/bootstrap.ts hardcodes the
// literal "custom" (it can't import). This guard fails loudly if the
// registry id ever drifts from that literal.
it('CUSTOM_THEME_ID stays the literal "custom" the bootstrap script hardcodes', () => {
  expect(CUSTOM_THEME_ID).toBe("custom");
});

const CATPPUCCIN_BASE: PaletteBase = {
  id: "catppuccin",
  light: { background: "#eff1f5", primary: "#8839ef" },
  dark: { background: "#303446", primary: "#ca9ee6" },
};

function resolve(id: string): PaletteBase | undefined {
  return id === "catppuccin" ? CATPPUCCIN_BASE : undefined;
}

describe("forkPaletteToCustom", () => {
  it("forking off a named palette snapshots both mode var maps (the FT-001 bug)", () => {
    const r = forkPaletteToCustom(
      { activeId: "catppuccin" },
      resolve,
      CUSTOM,
    );
    expect(r).toEqual({ activeId: CUSTOM, base: CATPPUCCIN_BASE });
    // Self-contained: light AND dark survive, so a mode flip after
    // reload still paints the right palette.
    expect(r.base?.light).toEqual(CATPPUCCIN_BASE.light);
    expect(r.base?.dark).toEqual(CATPPUCCIN_BASE.dark);
  });

  it("forking off Default carries no base", () => {
    expect(forkPaletteToCustom({ activeId: null }, resolve, CUSTOM)).toEqual({
      activeId: CUSTOM,
    });
  });

  it("already custom is a no-op (same reference) — repeated setVar never re-snapshots", () => {
    const slice: PaletteSlice = { activeId: CUSTOM, base: CATPPUCCIN_BASE };
    expect(forkPaletteToCustom(slice, resolve, CUSTOM)).toBe(slice);
    // And a baseless custom stays baseless rather than inventing one.
    const baseless: PaletteSlice = { activeId: CUSTOM };
    expect(forkPaletteToCustom(baseless, resolve, CUSTOM)).toBe(baseless);
  });

  it("an unresolvable id (reactive / uninstalled theme) forks without a base", () => {
    expect(
      forkPaletteToCustom({ activeId: "background-reactive" }, resolve, CUSTOM),
    ).toEqual({ activeId: CUSTOM });
  });

  it("does not mutate the input slice", () => {
    const slice: PaletteSlice = { activeId: "catppuccin" };
    forkPaletteToCustom(slice, resolve, CUSTOM);
    expect(slice).toEqual({ activeId: "catppuccin" });
  });
});

describe("paletteAfterReset", () => {
  it("a custom fork off a named palette restores that palette", () => {
    const r = paletteAfterReset(
      { activeId: CUSTOM, base: CATPPUCCIN_BASE },
      CUSTOM,
    );
    expect(r).toEqual({ activeId: "catppuccin" });
    // The base snapshot is dropped — the live registry owns the
    // palette again.
    expect("base" in r).toBe(false);
  });

  it("a baseless custom demotes to Default", () => {
    expect(paletteAfterReset({ activeId: CUSTOM }, CUSTOM)).toEqual({
      activeId: null,
    });
  });

  it("non-custom palettes demote to Default (pre-fork behaviour)", () => {
    expect(paletteAfterReset({ activeId: "catppuccin" }, CUSTOM)).toEqual({
      activeId: null,
    });
    expect(paletteAfterReset({ activeId: null }, CUSTOM)).toEqual({
      activeId: null,
    });
  });
});
