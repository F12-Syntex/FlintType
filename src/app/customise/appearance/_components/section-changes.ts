"use client";

import { useMemo } from "react";
import { DEFAULT_APPEARANCE, useAppearancePrefs } from "@/lib/appearance-prefs";
import { useBackgroundPrefs } from "@/lib/background-prefs";
import { useCaretSettings } from "@/lib/caret-settings";
import { useKeyboardSettings } from "@/lib/keyboard-settings";
import { type ThemeVar, useThemeOverrides } from "@/lib/theme-customization";
import { CUSTOM_THEME_ID } from "@/lib/themes/registry";
import { usePalette } from "@/lib/themes/use-palette";
import { changedAppearanceSections } from "./section-fields";

const TYPOGRAPHY_VARS: readonly ThemeVar[] = [
  "--ft-font-family",
  "--ft-font-scale",
  "--ft-word-spacing",
];
const GEOMETRY_VARS: readonly ThemeVar[] = ["--radius"];

/** Live per-section "is this customised away from default" map, keyed by
 *  the section ids in `_sections.ts`. Composes every store an appearance
 *  section can draw from: the theme-override vars (split into colors /
 *  geometry / typography), the AppearancePrefs slice, the caret /
 *  keyboard / background stores, and the active palette. */
export function useSectionChanges(): Record<string, boolean> {
  const { overrides } = useThemeOverrides();
  const { prefs } = useAppearancePrefs();
  const caret = useCaretSettings();
  const background = useBackgroundPrefs();
  const keyboard = useKeyboardSettings();
  const { activeId } = usePalette();

  return useMemo(() => {
    const appearance = changedAppearanceSections(prefs, DEFAULT_APPEARANCE);

    let colors = false;
    let typography = false;
    let radius = false;
    for (const [name, value] of Object.entries(overrides)) {
      if (typeof value !== "string" || value === "") continue;
      if (TYPOGRAPHY_VARS.includes(name as ThemeVar)) typography = true;
      else if (GEOMETRY_VARS.includes(name as ThemeVar)) radius = true;
      else colors = true;
    }

    return {
      themes: activeId !== null && activeId !== CUSTOM_THEME_ID,
      colors,
      geometry: radius || appearance.has("geometry"),
      surface: appearance.has("surface"),
      chrome: appearance.has("chrome"),
      caret: caret.isCustomised || appearance.has("caret"),
      mistakes: appearance.has("mistakes"),
      typography,
      keyboard: keyboard.isCustomised,
      background: background.isCustomised,
      "live-stats": appearance.has("live-stats"),
      "typing-area": appearance.has("typing-area"),
      tape: appearance.has("tape"),
      result: appearance.has("result"),
      keymap: appearance.has("keymap"),
      multiplayer: appearance.has("multiplayer"),
    };
  }, [
    overrides,
    prefs,
    caret.isCustomised,
    background.isCustomised,
    keyboard.isCustomised,
    activeId,
  ]);
}
