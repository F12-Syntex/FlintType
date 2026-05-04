"use client";

import { useTheme as useNextTheme } from "next-themes";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
} from "react";
import { useBackgroundPrefs } from "../background-prefs";
import { useRemotePrefs } from "../use-remote-prefs";
import {
  applyReactivePalette,
  BACKGROUND_REACTIVE_ID,
  clearReactivePalette,
  samplePalette,
} from "./background-reactive";
import {
  applyTheme,
  clearThemeVars,
  findTheme,
  THEMES,
  type Theme,
} from "./registry";

/** Synthetic theme entry for the picker. Has no static cssVars — when
 *  selected, the provider samples the current background image and
 *  writes the resulting palette as inline :root styles. */
const REACTIVE_THEME: Theme = {
  id: BACKGROUND_REACTIVE_ID,
  name: "Background reactive",
  cssVars: { light: {}, dark: {} },
};

type Ctx = {
  themes: readonly Theme[];
  activeId: string | null;
  apply: (id: string) => void;
  reset: () => void;
};

type PaletteSlice = { activeId: string | null };
const DEFAULT_PALETTE: PaletteSlice = { activeId: null };

const PaletteContext = createContext<Ctx | null>(null);

/** Hosts the active palette id (now stored in the user's prefs blob)
 *  and re-applies its CSS vars whenever next-themes flips light/dark.
 *  Sits inside <ThemeProvider> in src/app/providers.tsx so
 *  `resolvedTheme` is available. */
export function PaletteProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNextTheme();
  const { value, update, reset } = useRemotePrefs<PaletteSlice>(
    "palette",
    DEFAULT_PALETTE,
  );
  const activeId = value.activeId;
  const { effectiveImage } = useBackgroundPrefs();

  useEffect(() => {
    const root = document.documentElement;
    // Hard reset on every switch: strip every var any static theme can
    // set AND every var the reactive palette can set, before applying
    // anything new. Without this, a switch from Reactive → Static (or
    // Static A → Static B with non-overlapping var sets) can leave
    // stray inline overrides on :root that bleed into the new palette.
    clearThemeVars(root);
    clearReactivePalette(root);

    if (activeId === BACKGROUND_REACTIVE_ID) {
      // Sampling is async; if the image isn't ready, the just-cleared
      // :root falls back to the default palette until it loads.
      if (!effectiveImage) return;
      let cancelled = false;
      const sampleMode: "light" | "dark" =
        resolvedTheme === "dark" ? "dark" : "light";
      void samplePalette(effectiveImage, sampleMode).then((palette) => {
        if (cancelled || !palette) return;
        applyReactivePalette(root, palette);
      });
      return () => {
        cancelled = true;
      };
    }
    const theme = findTheme(activeId);
    if (!theme) return;
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    applyTheme(root, theme, mode);
  }, [activeId, resolvedTheme, effectiveImage]);

  const apply = useCallback(
    (id: string) => {
      update({ activeId: id });
    },
    [update],
  );

  const resetPalette = useCallback(() => {
    reset();
  }, [reset]);

  // Synthetic + static themes side by side. The reactive entry sits at
  // the head so it surfaces above the alphabetical list of static
  // tweakcn imports.
  const themes = [REACTIVE_THEME, ...THEMES];

  return (
    <PaletteContext.Provider
      value={{ themes, activeId, apply, reset: resetPalette }}
    >
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette(): Ctx {
  const ctx = useContext(PaletteContext);
  if (!ctx) {
    throw new Error("usePalette must be used inside <PaletteProvider>");
  }
  return ctx;
}

export type { Theme };
