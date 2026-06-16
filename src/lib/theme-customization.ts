"use client";

import { useCallback, useEffect, useRef } from "react";
import { loadPrefs, readSlice, writeSlice } from "./prefs-store";
import {
  clearOverride,
  diffAppliedVars,
  EMPTY_OVERRIDES,
  migrateThemeState,
  setOverride,
} from "./themes/overrides";
import {
  forkPaletteToCustom,
  paletteAfterReset,
  type PaletteBase,
  type PaletteSlice,
} from "./themes/palette-fork";
import { CUSTOM_THEME_ID, findTheme, getThemeRoot } from "./themes/registry";
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

/** Resolve a named palette id to a fork snapshot (both mode var maps).
 *  Reactive / unknown ids resolve to undefined — those fork baseless. */
function resolvePaletteBase(id: string): PaletteBase | undefined {
  const t = findTheme(id);
  if (!t) return undefined;
  return { id: t.id, light: t.cssVars.light, dark: t.cssVars.dark };
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
    if (!m.changed) return;
    writeSlice("theme", m.theme);
    writeSlice("palette", m.palette);
  });
}

export function useThemeOverrides() {
  // The slice itself is the ThemeOverrides record. We deliberately use
  // an empty-object default so peer slices (caret, behaviour, …) don't
  // see leaked theme keys.
  const { value: overrides, update: updateRaw, reset: resetRaw } =
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

  const setVar = useCallback(
    (name: ThemeVar, value: string) => {
      updateRaw((prev) => setOverride(prev, name, value));
      applyVar(name, value);
      // Any per-var override forks the user off whatever named palette
      // they were on — mark the palette slice as "custom" so the theme
      // picker reads as Custom instead of misleadingly still saying
      // "Cosmic Night" (etc.) once the colours diverge. The fork
      // snapshots the named palette's cssVars (`base`) so the rest of
      // the palette keeps painting after a reload — without it the
      // bootstrap script replays only blob.theme and the named palette
      // was silently destroyed (it persisted as nothing but its id).
      const palette = readSlice<PaletteSlice>("palette", { activeId: null });
      const forked = forkPaletteToCustom(
        palette,
        resolvePaletteBase,
        CUSTOM_THEME_ID,
      );
      if (forked !== palette) writeSlice("palette", forked);
    },
    [updateRaw],
  );

  const clearVar = useCallback(
    (name: ThemeVar) => {
      updateRaw((prev) => clearOverride(prev, name));
      applyVar(name, undefined);
      // Don't auto-demote palette here — the user might still have other
      // overrides active. They demote by either resetting all overrides
      // or by picking a real theme from the picker (which clears the
      // override slice via PaletteProvider.apply).
    },
    [updateRaw],
  );

  const reset = useCallback(() => {
    for (const v of THEME_VARS) applyVar(v, undefined);
    resetRaw();
    // No more overrides — a custom fork off a named palette goes back
    // to that palette (the user dropped their nudges, not the palette
    // they picked); everything else demotes to Default.
    const palette = readSlice<PaletteSlice>("palette", { activeId: null });
    writeSlice("palette", paletteAfterReset(palette, CUSTOM_THEME_ID));
  }, [resetRaw]);

  return { overrides, setVar, clearVar, reset };
}
