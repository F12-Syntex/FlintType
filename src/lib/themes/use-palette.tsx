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
import { clearSlice, writeSlice } from "../prefs-store";
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
  getThemeRoot,
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
    // Themes paint on <html> so every surface (chrome, typing area,
    // customise previews) picks them up via the CSS cascade. SSR
    // no-op.
    const root = getThemeRoot();
    if (!root) return;

    // "custom" — the user has per-var overrides applied via
    // useThemeOverrides. Don't touch the named-theme vars: the inline
    // overrides from useThemeOverrides are the source of truth and
    // would otherwise get clobbered by clearThemeVars below.
    if (activeId === CUSTOM_THEME_ID) {
      clearReactivePalette(root);
      return;
    }

    if (activeId === BACKGROUND_REACTIVE_ID) {
      // Reactive is async — sampling takes a frame or two. If we
      // cleared upfront and *then* sampled, every re-render would
      // briefly drop the user back to the default palette until the
      // sample resolves. Instead, leave the prior reactive palette
      // in place and swap atomically inside the .then — clear +
      // apply in the same paint, no flash.
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
    // pass so the swap repaints every surface at once.
    const theme = findTheme(activeId);
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    clearThemeVars(root);
    clearReactivePalette(root);
    if (theme) applyTheme(root, theme, mode);
  }, [activeId, resolvedTheme, effectiveImage]);

  const apply = useCallback(
    (id: string) => {
      // Custom is the synthetic "user has per-var overrides" id —
      // picking it from the menu is a no-op (the overrides are already
      // active on :root). For every other pick, themes own ONLY the
      // sections explicitly tied to visual identity: colours,
      // geometry, typography (all CSS-var driven, applied via
      // cssVars + themeOverrides slice) and the keyboard widget
      // settings. Caret, live stats, tape, lines, result, multiplayer
      // and other appearance-slice prefs are user-owned and survive
      // a theme switch — themes used to wipe them, which surprised
      // users who'd carefully tuned those settings and didn't expect
      // a colour pick to clear them.
      if (id !== CUSTOM_THEME_ID) {
        clearSlice("keyboard");
        const theme = findTheme(id);
        // Theme overrides slice is the per-CSS-var customisations
        // layer (e.g. --ft-font-scale, --radius). Default to empty
        // so the named theme paints unhindered; let the preset write
        // any values it cares about on top.
        writeSlice("theme", theme?.presets?.themeOverrides ?? {});
        if (theme?.presets?.keyboard) {
          writeSlice("keyboard", theme.presets.keyboard);
        }
      }
      update({ activeId: id });
    },
    [update],
  );

  const resetPalette = useCallback(() => {
    // "Reset" = back to Default palette. Mirrors apply(): wipes only
    // the slices themes own (theme overrides + keyboard); the user's
    // caret / appearance picks survive.
    writeSlice("theme", {});
    clearSlice("keyboard");
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
