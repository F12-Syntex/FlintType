"use client";

import { useCallback, useMemo } from "react";
import { clearSlice, readSlice, writeSlice } from "../prefs-store";
import type { ThemeOverrides, ThemeVar } from "../theme-customization";
import { EMPTY_OVERRIDES } from "./overrides";
import {
  paletteAfterRestore,
  paletteBaseline,
  palettePresetSlices,
  restoreVarsToBaseline,
} from "./palette-baseline";
import type { PaletteSlice } from "./palette-fork";
import { CUSTOM_THEME_ID, findTheme } from "./registry";
import { usePalette } from "./use-palette";

/** The active palette's baseline (defaults + its applied presets) and
 *  the two writes a settings page's Reset needs to return to it. The
 *  maths lives in palette-baseline.ts; this hook only reads the active
 *  palette and writes the prefs slices. */
export function usePaletteBaseline() {
  const { baselineId } = usePalette();
  const theme = findTheme(baselineId);
  const baseline = useMemo(() => paletteBaseline(theme), [theme]);

  /** Put `vars` back to the palette's values. When that leaves a custom
   *  fork identical to the palette it came off, the picker reads that
   *  palette again instead of "Custom". */
  const restoreVars = useCallback(
    (vars: readonly ThemeVar[]) => {
      const current = readSlice<ThemeOverrides>("theme", EMPTY_OVERRIDES);
      const next = restoreVarsToBaseline(
        current,
        baseline.themeOverrides,
        vars,
      );
      writeSlice("theme", next, vars);
      const palette = readSlice<PaletteSlice>("palette", { activeId: null });
      const after = paletteAfterRestore(
        palette,
        next,
        baseline.themeOverrides,
        CUSTOM_THEME_ID,
      );
      if (after !== palette) writeSlice("palette", after);
    },
    [baseline],
  );

  /** Put the keyboard widget back to the palette's look, written the
   *  same way a palette pick writes it. */
  const restoreKeyboard = useCallback(() => {
    const preset = palettePresetSlices(theme).keyboard;
    clearSlice("keyboard");
    if (preset) writeSlice("keyboard", preset);
  }, [theme]);

  return { baseline, restoreVars, restoreKeyboard };
}
