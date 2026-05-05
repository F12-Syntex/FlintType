"use client";

import { useCallback, useEffect, useRef } from "react";
import { writeSlice } from "./prefs-store";
import { CUSTOM_THEME_ID } from "./themes/registry";
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
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (value == null || value === "") {
    root.style.removeProperty(name);
  } else {
    root.style.setProperty(name, value);
  }
}

const EMPTY_OVERRIDES: ThemeOverrides = {};

export function useThemeOverrides() {
  // The slice itself is the ThemeOverrides record. We deliberately use
  // an empty-object default so peer slices (caret, behaviour, …) don't
  // see leaked theme keys.
  const { value: overrides, update: updateRaw, reset: resetRaw } =
    useRemotePrefs<ThemeOverrides>("theme", EMPTY_OVERRIDES);

  // Apply only the vars this hook actually owns. The previous version
  // unconditionally called applyVar(v, undefined) for every THEME_VAR
  // not present in overrides, which trampled inline :root styles set
  // by the reactive-palette sampler — every unrelated pref-store
  // notify (caret toggle, behaviour change, anything) re-rendered
  // useRemotePrefs with a fresh `overrides` object identity, the
  // effect re-fired, and reactive's --primary / --background etc.
  // got removeProperty'd back to defaults. Track the set of vars this
  // hook has set and only remove the ones we wrote that no longer
  // appear in `overrides`.
  const appliedRef = useRef<Set<ThemeVar>>(new Set());
  useEffect(() => {
    const prev = appliedRef.current;
    const next = new Set<ThemeVar>();
    for (const v of THEME_VARS) {
      const value = overrides[v];
      if (value != null && value !== "") {
        applyVar(v, value);
        next.add(v);
      }
    }
    for (const v of prev) {
      if (!next.has(v)) applyVar(v, undefined);
    }
    appliedRef.current = next;
  }, [overrides]);

  const setVar = useCallback(
    (name: ThemeVar, value: string) => {
      updateRaw((prev) => ({ ...prev, [name]: value }));
      applyVar(name, value);
      // Any per-var override forks the user off whatever named palette
      // they were on — mark the palette slice as "custom" so the theme
      // picker reads as Custom instead of misleadingly still saying
      // "Cosmic Night" (etc.) once the colours diverge.
      writeSlice("palette", { activeId: CUSTOM_THEME_ID });
    },
    [updateRaw],
  );

  const clearVar = useCallback(
    (name: ThemeVar) => {
      updateRaw((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
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
    // No more overrides — demote the palette back to Default. Picking
    // a non-default palette afterwards is one click in the picker.
    writeSlice("palette", { activeId: null });
  }, [resetRaw]);

  return { overrides, setVar, clearVar, reset };
}
