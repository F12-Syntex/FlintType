"use client";

import { useCallback, useEffect } from "react";
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

  // Apply every override to :root whenever the slice changes — covers
  // the initial async load and any subsequent edit.
  useEffect(() => {
    for (const v of THEME_VARS) applyVar(v, overrides[v]);
  }, [overrides]);

  const setVar = useCallback(
    (name: ThemeVar, value: string) => {
      updateRaw((prev) => ({ ...prev, [name]: value }));
      applyVar(name, value);
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
    },
    [updateRaw],
  );

  const reset = useCallback(() => {
    for (const v of THEME_VARS) applyVar(v, undefined);
    resetRaw();
  }, [resetRaw]);

  return { overrides, setVar, clearVar, reset };
}
