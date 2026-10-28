import { describe, expect, it } from "vitest";
import type { ThemeOverrides } from "../theme-customization";
import { BACKGROUND_REACTIVE_ID } from "./background-reactive";
import { paletteBaseline, paletteSliceFor } from "./palette-baseline";
import {
  paletteAfterOverrideWrite,
  paletteAfterThemeMigration,
  type PaletteSlice,
  resolvePaletteBase,
} from "./palette-fork";
import { findTheme } from "./registry";

/** When the palette slice forks to Custom and when it settles back on
 *  a palette: after one override write and after the load-time theme
 *  migration. The fork snapshot itself is in palette-fork.test.ts. */

const CUSTOM = "custom";

describe("paletteAfterOverrideWrite", () => {
  // Cyberpunk's presets: Size 1.1 and Sharp (0rem) corners.
  const cyber = paletteBaseline(findTheme("cyberpunk")).themeOverrides;
  const named = paletteSliceFor("cyberpunk");
  const cyberFork: PaletteSlice = {
    activeId: CUSTOM,
    base: resolvePaletteBase("cyberpunk"),
  };
  const reactiveFork: PaletteSlice = {
    activeId: CUSTOM,
    base: resolvePaletteBase(BACKGROUND_REACTIVE_ID),
  };

  it("keeps a named palette when the write restates its own value", () => {
    // Clicking the already-selected "Sharp" corners on Cyberpunk.
    const o: ThemeOverrides = { ...cyber, "--radius": "0rem" };
    expect(paletteAfterOverrideWrite(named, o, CUSTOM)).toBe(named);
    // Same for a value spelled differently ("1.10" is Size 1.1).
    const spelled: ThemeOverrides = { ...cyber, "--ft-font-scale": "1.10" };
    expect(paletteAfterOverrideWrite(named, spelled, CUSTOM)).toBe(named);
  });

  it("forks a named palette with its base once a write departs from it", () => {
    const o: ThemeOverrides = { ...cyber, "--ft-font-scale": "1.15" };
    expect(paletteAfterOverrideWrite(named, o, CUSTOM)).toEqual(cyberFork);
    // Clearing a value the palette sets is a departure too.
    const cleared: ThemeOverrides = { "--ft-font-scale": "1.1" };
    expect(paletteAfterOverrideWrite(named, cleared, CUSTOM)).toEqual(cyberFork);
  });

  it("returns a fork to its palette when a size nudge goes back", () => {
    const up: ThemeOverrides = { ...cyber, "--ft-font-scale": "1.15" };
    expect(paletteAfterOverrideWrite(cyberFork, up, CUSTOM)).toBe(cyberFork);
    expect(paletteAfterOverrideWrite(cyberFork, cyber, CUSTOM)).toEqual(named);
  });

  it("keeps a fork while anything still differs", () => {
    const o: ThemeOverrides = { ...cyber, "--primary": "#00ff00" };
    expect(paletteAfterOverrideWrite(cyberFork, o, CUSTOM)).toBe(cyberFork);
  });

  it("forks Background reactive with its origin and returns to it", () => {
    const reactive: PaletteSlice = { activeId: BACKGROUND_REACTIVE_ID };
    const o: ThemeOverrides = { "--primary": "#00ff00" };
    expect(paletteAfterOverrideWrite(reactive, o, CUSTOM)).toEqual(reactiveFork);
    expect(paletteAfterOverrideWrite(reactiveFork, o, CUSTOM)).toBe(reactiveFork);
    expect(paletteAfterOverrideWrite(reactiveFork, {}, CUSTOM)).toEqual({
      activeId: BACKGROUND_REACTIVE_ID,
    });
  });

  it("leaves Default alone on a no-op write and forks it baseless otherwise", () => {
    const def: PaletteSlice = { activeId: null };
    // Size at 100% spelled out is still the default.
    expect(
      paletteAfterOverrideWrite(def, { "--ft-font-scale": "1" }, CUSTOM),
    ).toBe(def);
    expect(
      paletteAfterOverrideWrite(def, { "--radius": "0rem" }, CUSTOM),
    ).toEqual({ activeId: CUSTOM });
  });

  it("returns a fork off Default to Default once nothing differs", () => {
    const baseless: PaletteSlice = { activeId: CUSTOM };
    // Accent changed, then its per-row Reset: nothing left.
    expect(paletteAfterOverrideWrite(baseless, {}, CUSTOM)).toEqual({
      activeId: null,
    });
    // Size nudged up and back down, spelled as 100%.
    expect(
      paletteAfterOverrideWrite(baseless, { "--ft-font-scale": "1.0" }, CUSTOM),
    ).toEqual({ activeId: null });
  });

  it("keeps a fork off Default while anything still differs", () => {
    const baseless: PaletteSlice = { activeId: CUSTOM };
    const o: ThemeOverrides = { "--primary": "#00ff00" };
    expect(paletteAfterOverrideWrite(baseless, o, CUSTOM)).toBe(baseless);
  });

  it("returns a fork off a palette without presets once nothing is overridden", () => {
    const fork: PaletteSlice = {
      activeId: CUSTOM,
      base: resolvePaletteBase("catppuccin"),
    };
    expect(paletteAfterOverrideWrite(fork, {}, CUSTOM)).toEqual(
      paletteSliceFor("catppuccin"),
    );
  });

  it("keeps a fork off a palette with presets after the last override goes", () => {
    // Size at 100% on Bold Tech clears the only override, but Bold
    // Tech's own size is 1.05, so it still differs from the palette.
    const fork: PaletteSlice = {
      activeId: CUSTOM,
      base: resolvePaletteBase("bold-tech"),
    };
    expect(paletteAfterOverrideWrite(fork, {}, CUSTOM)).toBe(fork);
  });

  it("keeps a fork whose base is no longer installed", () => {
    const gone: PaletteSlice = {
      activeId: CUSTOM,
      base: { id: "uninstalled", light: { primary: "#123456" }, dark: {} },
    };
    expect(paletteAfterOverrideWrite(gone, {}, CUSTOM)).toBe(gone);
  });
});

describe("paletteAfterThemeMigration", () => {
  const forkOff = (id: string): PaletteSlice => ({
    activeId: CUSTOM,
    base: resolvePaletteBase(id),
  });

  it("keeps a fork off a palette with presets Custom when no overrides are left", () => {
    // The reload half of Size 100% on Bold Tech: no rewrite, so the
    // picker keeps reading Custom while the page still shows Reset (1).
    const fork = forkOff("bold-tech");
    expect(paletteAfterThemeMigration(fork, {}, CUSTOM)).toBe(fork);
    const cyber = forkOff("cyberpunk");
    // Round corners + Size 100% on Cyberpunk.
    expect(paletteAfterThemeMigration(cyber, {}, CUSTOM)).toBe(cyber);
  });

  it("returns a fork whose overrides match its palette's presets", () => {
    const cyber = paletteBaseline(findTheme("cyberpunk")).themeOverrides;
    expect(paletteAfterThemeMigration(forkOff("cyberpunk"), cyber, CUSTOM)).toEqual(
      paletteSliceFor("cyberpunk"),
    );
    expect(paletteAfterThemeMigration(forkOff("catppuccin"), {}, CUSTOM)).toEqual(
      paletteSliceFor("catppuccin"),
    );
  });

  it("returns a fork off Background reactive to Reactive", () => {
    const fork = forkOff(BACKGROUND_REACTIVE_ID);
    expect(paletteAfterThemeMigration(fork, {}, CUSTOM)).toEqual({
      activeId: BACKGROUND_REACTIVE_ID,
    });
  });

  it("demotes a fork off Default once the legacy overrides are stripped", () => {
    // The original migration case: "custom" only because of the
    // orange-as-override baggage, which migrateThemeState strips to {}.
    expect(paletteAfterThemeMigration({ activeId: CUSTOM }, {}, CUSTOM)).toEqual({
      activeId: null,
    });
  });

  it("keeps a fork with real overrides, and never moves another palette", () => {
    const fork = forkOff("cosmic-night");
    const o: ThemeOverrides = { "--primary": "#123456" };
    expect(paletteAfterThemeMigration(fork, o, CUSTOM)).toBe(fork);
    const named = paletteSliceFor("bold-tech");
    expect(paletteAfterThemeMigration(named, {}, CUSTOM)).toBe(named);
    const def: PaletteSlice = { activeId: null };
    expect(paletteAfterThemeMigration(def, o, CUSTOM)).toBe(def);
  });

  it("is idempotent", () => {
    const once = paletteAfterThemeMigration(forkOff("catppuccin"), {}, CUSTOM);
    expect(paletteAfterThemeMigration(once, {}, CUSTOM)).toBe(once);
  });
});
