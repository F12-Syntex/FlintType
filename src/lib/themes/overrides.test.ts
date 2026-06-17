import { describe, expect, it } from "vitest";
import type { ThemeOverrides, ThemeVar } from "../theme-customization";
import {
  clearOverride,
  diffAppliedVars,
  EMPTY_OVERRIDES,
  isOverridden,
  LEGACY_BAKED_OVERRIDES,
  migrateThemeState,
  overrideCount,
  overriddenVars,
  setOverride,
  stripLegacyBaked,
} from "./overrides";

const CUSTOM = "custom";

describe("theme override defaults", () => {
  it("the slice default is truly empty (nothing reads as overridden)", () => {
    // Regression: a non-empty default merged by readSlice could never be
    // cleared, which made --primary permanently 'overridden' and the
    // default theme read as Custom.
    expect(EMPTY_OVERRIDES).toEqual({});
    expect(overrideCount(EMPTY_OVERRIDES)).toBe(0);
    expect(isOverridden(EMPTY_OVERRIDES, "--primary")).toBe(false);
  });
});

describe("isOverridden / overriddenVars / overrideCount", () => {
  it("only a non-empty string counts as an override", () => {
    expect(isOverridden({}, "--primary")).toBe(false);
    expect(isOverridden({ "--primary": "" }, "--primary")).toBe(false);
    expect(isOverridden({ "--primary": "#fff" }, "--primary")).toBe(true);
  });

  it("counts and lists only real overrides", () => {
    const o: ThemeOverrides = {
      "--primary": "#abc",
      "--ring": "",
      "--background": "#fff",
    };
    expect(overriddenVars(o).sort()).toEqual(["--background", "--primary"]);
    expect(overrideCount(o)).toBe(2);
  });
});

describe("setOverride / clearOverride (the change → reset cycle)", () => {
  it("set then clear returns to the default (the reset bug)", () => {
    let o: ThemeOverrides = { ...EMPTY_OVERRIDES };
    o = setOverride(o, "--primary", "#123456");
    expect(isOverridden(o, "--primary")).toBe(true);
    expect(o["--primary"]).toBe("#123456");

    o = clearOverride(o, "--primary");
    // Cleared for real — the key is gone, NOT re-merged from a non-empty
    // default. This is exactly what was broken before.
    expect(isOverridden(o, "--primary")).toBe(false);
    expect("--primary" in o).toBe(false);
    expect(overrideCount(o)).toBe(0);
  });

  it("does not mutate the input record", () => {
    const o: ThemeOverrides = { "--primary": "#111" };
    const set = setOverride(o, "--ring", "#222");
    expect(o).toEqual({ "--primary": "#111" });
    expect(set).toEqual({ "--primary": "#111", "--ring": "#222" });
    const cleared = clearOverride(set, "--primary");
    expect(set).toEqual({ "--primary": "#111", "--ring": "#222" });
    expect(cleared).toEqual({ "--ring": "#222" });
  });

  it("clearing an absent key is a no-op (same reference)", () => {
    const o: ThemeOverrides = { "--primary": "#111" };
    expect(clearOverride(o, "--ring")).toBe(o);
  });

  it("setting one var leaves the others untouched", () => {
    let o: ThemeOverrides = { "--primary": "#111", "--background": "#fff" };
    o = setOverride(o, "--primary", "#222");
    expect(o).toEqual({ "--primary": "#222", "--background": "#fff" });
  });
});

describe("diffAppliedVars (what the apply effect sets/removes)", () => {
  it("sets the vars present, removes ones the hook previously wrote", () => {
    const prev = new Set<ThemeVar>(["--primary", "--background"]);
    const o: ThemeOverrides = { "--primary": "#222", "--accent": "#333" };
    const { set, remove, nextKeys } = diffAppliedVars(prev, o);
    expect(set.sort()).toEqual([
      ["--accent", "#333"],
      ["--primary", "#222"],
    ]);
    // --background was applied before, no longer present → remove it so
    // it falls back to the palette / :root default.
    expect(remove).toEqual(["--background"]);
    expect([...nextKeys].sort()).toEqual(["--accent", "--primary"]);
  });

  it("ignores empty-string values", () => {
    const { set, nextKeys } = diffAppliedVars(new Set(), {
      "--primary": "",
      "--ring": "#abc",
    });
    expect(set).toEqual([["--ring", "#abc"]]);
    expect([...nextKeys]).toEqual(["--ring"]);
  });

  it("empty overrides remove everything previously applied", () => {
    const prev = new Set<ThemeVar>(["--primary", "--ring", "--radius"]);
    const { set, remove } = diffAppliedVars(prev, EMPTY_OVERRIDES);
    expect(set).toEqual([]);
    expect(remove.sort()).toEqual(["--primary", "--radius", "--ring"]);
  });
});

describe("stripLegacyBaked", () => {
  it("removes overrides equal to the legacy baked default", () => {
    const o: ThemeOverrides = { ...LEGACY_BAKED_OVERRIDES };
    expect(stripLegacyBaked(o)).toEqual({});
  });

  it("keeps overrides the user genuinely changed", () => {
    const o: ThemeOverrides = {
      "--primary": "#123456", // user-picked, not the legacy orange
      "--radius": "0.5rem", // equals legacy → stripped
      "--background": "#ffffff",
    };
    expect(stripLegacyBaked(o)).toEqual({
      "--primary": "#123456",
      "--background": "#ffffff",
    });
  });

  it("is idempotent and doesn't clone when nothing matches", () => {
    const o: ThemeOverrides = { "--primary": "#123456" };
    expect(stripLegacyBaked(o)).toBe(o);
    const once = stripLegacyBaked({ ...LEGACY_BAKED_OVERRIDES, "--background": "#fff" });
    expect(stripLegacyBaked(once)).toEqual(once);
  });
});

describe("migrateThemeState (off the fake-default)", () => {
  it("a pristine fake-default account becomes a clean Default", () => {
    // palette=custom + only the baked overrides → the old fresh-account
    // state. Migrates to Default (null) + empty overrides.
    const r = migrateThemeState(
      { activeId: CUSTOM },
      { ...LEGACY_BAKED_OVERRIDES },
      CUSTOM,
    );
    expect(r.changed).toBe(true);
    expect(r.palette).toEqual({ activeId: null });
    expect(r.theme).toEqual({});
  });

  it("a real custom palette with genuine overrides is preserved", () => {
    const theme: ThemeOverrides = {
      ...LEGACY_BAKED_OVERRIDES, // baked baggage rides along
      "--primary": "#123456", // genuine pick — must survive the spread
    };
    const r = migrateThemeState({ activeId: CUSTOM }, theme, CUSTOM);
    // Legacy baggage stripped, but the genuine --primary + custom palette stay.
    expect(r.theme).toEqual({ "--primary": "#123456" });
    expect(r.palette).toEqual({ activeId: CUSTOM });
    expect(r.changed).toBe(true);
  });

  it("a named palette is never demoted, even if overrides clear out", () => {
    const r = migrateThemeState(
      { activeId: "catppuccin" },
      { ...LEGACY_BAKED_OVERRIDES },
      CUSTOM,
    );
    expect(r.palette).toEqual({ activeId: "catppuccin" });
    expect(r.theme).toEqual({});
    expect(r.changed).toBe(true);
  });

  it("an already-clean Default account is unchanged (no write)", () => {
    const r = migrateThemeState({ activeId: null }, {}, CUSTOM);
    expect(r.changed).toBe(false);
    expect(r.palette).toEqual({ activeId: null });
    expect(r.theme).toEqual({});
  });

  it("a custom fork keeps its base snapshot while real overrides remain", () => {
    const base = {
      id: "catppuccin",
      light: { primary: "#8839ef" },
      dark: { primary: "#ca9ee6" },
    };
    const r = migrateThemeState(
      { activeId: CUSTOM, base },
      { "--primary": "#123456" },
      CUSTOM,
    );
    expect(r.changed).toBe(false);
    expect(r.palette).toEqual({ activeId: CUSTOM, base });
  });

  it("a custom fork with no overrides left demotes back to its base palette", () => {
    const base = {
      id: "catppuccin",
      light: { primary: "#8839ef" },
      dark: { primary: "#ca9ee6" },
    };
    const r = migrateThemeState({ activeId: CUSTOM, base }, {}, CUSTOM);
    expect(r.changed).toBe(true);
    expect(r.palette).toEqual({ activeId: "catppuccin" });
  });

  it("is idempotent — running twice changes nothing the second time", () => {
    const first = migrateThemeState(
      { activeId: CUSTOM },
      { ...LEGACY_BAKED_OVERRIDES },
      CUSTOM,
    );
    const second = migrateThemeState(first.palette, first.theme, CUSTOM);
    expect(second.changed).toBe(false);
    expect(second.palette).toEqual(first.palette);
    expect(second.theme).toEqual(first.theme);
  });
});
