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
import { writeSlice } from "../prefs-store";
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
  CUSTOM_THEME_ID,
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

    // "custom" — the user has per-var overrides applied via
    // useThemeOverrides. Don't touch the named-theme vars: the inline
    // overrides on :root from useThemeOverrides are the source of truth
    // and would otherwise get clobbered by clearThemeVars below.
    if (activeId === CUSTOM_THEME_ID) {
      clearReactivePalette(root);
      return;
    }

    if (activeId === BACKGROUND_REACTIVE_ID) {
      // Reactive is async — sampling takes a frame or two. If we
      // cleared :root upfront and *then* sampled, every re-render
      // (e.g. an unrelated pref-store notify that re-instantiates
      // this effect) would briefly drop the user back to the default
      // palette until the sample resolves. Instead, leave the prior
      // reactive palette in place and swap atomically inside the
      // .then — clear + apply in the same paint, no flash.
      if (!effectiveImage) {
        clearThemeVars(root);
        clearReactivePalette(root);
        return;
      }
      let cancelled = false;
      const sampleMode: "light" | "dark" =
        resolvedTheme === "dark" ? "dark" : "light";
      void samplePalette(effectiveImage, sampleMode).then((palette) => {
        if (cancelled || !palette) return;
        clearThemeVars(root);
        applyReactivePalette(root, palette);
      });
      return () => {
        cancelled = true;
      };
    }

    // Non-reactive paths are synchronous — clear and apply in one
    // pass with no observable gap.
    clearThemeVars(root);
    clearReactivePalette(root);
    const theme = findTheme(activeId);
    if (!theme) return;
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    applyTheme(root, theme, mode);
  }, [activeId, resolvedTheme, effectiveImage]);

  const apply = useCallback(
    (id: string) => {
      // Picking a real palette resets the per-var override slice — those
      // were "Custom" mode's payload, and carrying them onto a fresh
      // palette would mean the named theme never actually paints (the
      // overrides win). Don't touch overrides when the caller deliberately
      // re-picks "custom" (no-op).
      if (id !== CUSTOM_THEME_ID) {
        writeSlice("theme", {});
      }
      update({ activeId: id });
    },
    [update],
  );

  const resetPalette = useCallback(() => {
    writeSlice("theme", {});
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
