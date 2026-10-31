"use client";

import { useCallback, useEffect, useRef } from "react";
import { loadPrefs, readSlice, writeSlice } from "./prefs-store";
import {
  clearOverride,
  diffAppliedVars,
  EMPTY_OVERRIDES,
  isOverridden,
  migrateThemeState,
  overriddenVars,
  setOverride,
} from "./themes/overrides";
import {
  paletteAfterOverrideWrite,
  paletteAfterReset,
  paletteAfterThemeMigration,
  type PaletteSlice,
} from "./themes/palette-fork";
import { CUSTOM_THEME_ID, getThemeRoot } from "./themes/registry";
import { useRemotePrefs } from "./use-remote-prefs";

/** Every CSS variable the user can override from the appearance page.
 *  The page sets any of these on `:root` via inline style; absence
 *  falls back to the default in globals.css. */
export const THEME_VARS = [
  // Color tokens
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--muted",
  "--muted-foreground",
  "--border",
  "--input",
  "--ring",
  // Geometry / typography
  "--radius",
  // Custom flinttype customization tokens (consumed by globals.css body).
  // The --ft-bg-* family is owned by background-prefs.ts / BackgroundApplier
  // and intentionally absent from this list.
  "--ft-font-family",
  "--ft-font-scale",
  // Spacing between words on the practice passage. Read by passage.tsx.
  "--ft-word-spacing",
  // Passage-specific colour tokens — separate from --primary /
  // --muted-foreground / --destructive because the passage is the
  // *only* place where typed/untyped/error letters need their own scale
  // (MT's main/sub/error split, for instance). Defaulted to
  // var(--primary), var(--muted-foreground) and var(--destructive)
  // inside passage.tsx, so chrome text isn't affected by overrides
  // scoped to the passage.
  "--ft-passage-typed",
  "--ft-passage-untyped",
  "--ft-passage-error",
] as const;

export type ThemeVar = (typeof THEME_VARS)[number];
export type ThemeOverrides = Partial<Record<ThemeVar, string>>;

function applyVar(name: ThemeVar, value: string | undefined) {
  // Per-var overrides live alongside named themes on <html> so every
  // surface picks them up via the CSS cascade.
  const root = getThemeRoot();
  if (!root) return;
  if (value == null || value === "") {
    root.style.removeProperty(name);
  } else {
    root.style.setProperty(name, value);
  }
}

/** Write the overrides slice, then settle the palette slice: fork to
 *  "custom" while the overrides differ from what the palette sets, and
 *  go back to the palette a fork came off (Default when it has no base)
 *  once they match it again (`paletteAfterOverrideWrite`). The load-time
 *  migration below settles a stored fork by the same rule, so the
 *  picker reads the same after a reload. A no-op write, such as
 *  clicking the corner option the palette already uses, leaves the
 *  palette as it is. The fork snapshots the palette's cssVars (`base`)
 *  so the rest of it keeps painting after a reload (palette-fork.ts). */
function writeOverrides(next: ThemeOverrides, changed: ThemeVar) {
  writeSlice("theme", next, [changed]);
  const palette = readSlice<PaletteSlice>("palette", { activeId: null });
  const after = paletteAfterOverrideWrite(palette, next, CUSTOM_THEME_ID);
  if (after !== palette) writeSlice("palette", after);
}

/** Set one override, fork or settle the palette, and paint it at once.
 *  The same write every colour, font and size control makes; the
 *  settings import uses it too. */
export function setThemeVar(name: ThemeVar, value: string): void {
  const current = readSlice<ThemeOverrides>("theme", EMPTY_OVERRIDES);
  writeOverrides(setOverride(current, name, value), name);
  applyVar(name, value);
}

/** Clear one override so it falls back to the palette's own value. */
export function clearThemeVar(name: ThemeVar): void {
  const current = readSlice<ThemeOverrides>("theme", EMPTY_OVERRIDES);
  // Nothing to clear. Removing the inline var anyway would strip the
  // palette's own value for it (they share one inline style).
  if (!isOverridden(current, name)) return;
  writeOverrides(clearOverride(current, name), name);
  // PaletteProvider repaints the palette's own value underneath once
  // the set of overridden vars changes.
  applyVar(name, undefined);
}

/** Run the one-shot migration off the pre-2026-05 fake-default state
 *  (orange force-applied as an override + palette pinned to "custom")
 *  onto the real Default theme. Module-level guard so it fires once per
 *  page load no matter how many `useThemeOverrides` instances mount.
 *  Idempotent — `migrateThemeState` is a no-op once the slices are
 *  clean, so a later full reload re-runs it harmlessly. */
let themeMigrationRan = false;
function runThemeMigrationOnce() {
  if (themeMigrationRan) return;
  themeMigrationRan = true;
  void loadPrefs().then(() => {
    const storedTheme = readSlice<ThemeOverrides>("theme", EMPTY_OVERRIDES);
    const storedPalette = readSlice<PaletteSlice>("palette", {
      activeId: null,
    });
    const m = migrateThemeState(storedPalette, storedTheme, CUSTOM_THEME_ID);
    // The migration demotes a Custom fork as soon as no overrides are
    // left; a fork settles by the override-write rule instead, so it
    // stays Custom while it still differs from its palette's presets.
    const palette = paletteAfterThemeMigration(
      storedPalette,
      m.theme,
      CUSTOM_THEME_ID,
    );
    if (m.theme !== storedTheme) writeSlice("theme", m.theme);
    if (palette !== storedPalette) writeSlice("palette", palette);
  });
}

export function useThemeOverrides() {
  // The slice itself is the ThemeOverrides record. We deliberately use
  // an empty-object default so peer slices (caret, behaviour, …) don't
  // see leaked theme keys.
  const { value: overrides, reset: resetRaw } =
    useRemotePrefs<ThemeOverrides>("theme", EMPTY_OVERRIDES);

  // One-shot migration off the old fake-default (orange-as-override).
  useEffect(() => {
    runThemeMigrationOnce();
  }, []);

  // Apply only the vars this hook actually owns. Tracking the set of
  // vars we've written (and only removing those) keeps us from
  // trampling inline :root styles set by another layer — e.g. the
  // reactive-palette sampler — when an unrelated pref-store notify
  // re-renders this hook with a fresh `overrides` identity.
  const appliedRef = useRef<Set<ThemeVar>>(new Set());
  useEffect(() => {
    const root = getThemeRoot();
    if (!root) return;
    const { set, remove, nextKeys } = diffAppliedVars(
      appliedRef.current,
      overrides,
    );
    for (const [k, v] of set) root.style.setProperty(k, v);
    for (const k of remove) root.style.removeProperty(k);
    appliedRef.current = nextKeys;
  }, [overrides]);

  // Module functions, so their identity is already stable.
  const setVar = setThemeVar;
  const clearVar = clearThemeVar;

  const reset = useCallback(() => {
    const current = readSlice<ThemeOverrides>("theme", EMPTY_OVERRIDES);
    for (const v of overriddenVars(current)) applyVar(v, undefined);
    resetRaw();
    // No more overrides — a custom fork off a named palette goes back
    // to that palette (the user dropped their nudges, not the palette
    // they picked); everything else demotes to Default.
    const palette = readSlice<PaletteSlice>("palette", { activeId: null });
    writeSlice("palette", paletteAfterReset(palette, CUSTOM_THEME_ID));
  }, [resetRaw]);

  return { overrides, setVar, clearVar, reset };
}
