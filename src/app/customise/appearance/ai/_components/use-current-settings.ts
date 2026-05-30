"use client";

import { useCallback } from "react";
import { useAppearancePrefs } from "@/lib/appearance-prefs";
import { useBackgroundPrefs } from "@/lib/background-prefs";
import { THEME_VARS } from "@/lib/theme-customization";
import type { AiCurrentState } from "@/types/appearance-ai";

/** Capture a compact snapshot of the user's *current* settings to send
 *  with an AI request, so the model can reason relatively ("warmer", "a
 *  bit bigger") and reply with only the delta. Returns a reader so the
 *  values are read at call time (the resolved theme vars come from the
 *  live cascade via `getComputedStyle`). */
export function useCurrentSettings(): () => AiCurrentState {
  const { prefs: appearance } = useAppearancePrefs();
  const { prefs: background } = useBackgroundPrefs();

  return useCallback((): AiCurrentState => {
    // Resolved theme custom-properties from the cascade (current palette
    // + the user's overrides), so "warmer"/"darker" have real values.
    const theme: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const cs = getComputedStyle(document.documentElement);
      for (const v of THEME_VARS) {
        const val = cs.getPropertyValue(v).trim();
        if (val) theme[v] = val;
      }
    }

    // Appearance — primitives only (drop any object-valued slices).
    const appr: Record<string, string | number | boolean> = {};
    for (const [k, val] of Object.entries(appearance)) {
      const t = typeof val;
      if (t === "string" || t === "number" || t === "boolean") {
        appr[k] = val as string | number | boolean;
      }
    }

    // Background knobs only — never the imageUrl (it may be a multi-MB
    // data URL from a local upload, and the model doesn't need it).
    const bg: Record<string, string | number> = {
      fit: background.fit,
      scope: background.scope,
      opacity: background.opacity,
      blur: background.blur,
      darken: background.darken,
    };

    return { theme, appearance: appr, background: bg };
  }, [appearance, background]);
}
