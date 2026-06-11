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
import { clearSlice, readSlice, writeSlice } from "../prefs-store";
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

type PaletteSlice = {
  activeId: string | null;
  /** When `activeId === 'custom'`, the named/reactive palette the user
   *  forked from. The provider paints it underneath the per-var overrides
   *  so a single tweak no longer destroys the rest of the palette on
   *  reload (FT-001). Empty / absent means the fork sits on the Default
   *  (globals.css :root), which is always present. */
  baseId?: string;
};
// Fresh accounts land on the real Default theme — `activeId: null`, no
// overrides. The brand baseline (the orange --primary / --ring, the
// 0.5rem radius) now lives in `globals.css :root` / `.dark` as the
// Default theme itself, so there's no override layer to flash in and no
// reason to pretend a fresh account is "custom". Picking a community
// palette is one click in the picker.
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
  const baseId = value.baseId;
  const { effectiveImage } = useBackgroundPrefs();

  useEffect(() => {
    // Themes paint on <html> so every surface (chrome, typing area,
    // customise previews) picks them up via the CSS cascade. SSR
    // no-op.
    const root = getThemeRoot();
    if (!root) return;

    // The set of vars the user has overridden (inline, via
    // useThemeOverrides). We must NOT clear or repaint these when we
    // (re)apply a palette underneath them — their inline value is the
    // source of truth (FT-001).
    const overrideKeys = new Set(
      Object.keys(readSlice<Record<string, unknown>>("theme", {})),
    );

    // "custom" — the user forked a palette and applied per-var overrides.
    // Paint the palette they forked from (baseId) UNDERNEATH the
    // overrides, skipping the overridden keys, so the rest of the palette
    // survives a reload instead of collapsing to the Default. A blank
    // baseId means the fork sits on globals.css :root (always present).
    if (activeId === CUSTOM_THEME_ID) {
      const base = findTheme(baseId);
      const mode = resolvedTheme === "dark" ? "dark" : "light";
      if (base) {
        applyTheme(root, base, mode, overrideKeys);
        clearReactivePalette(root);
      }
      // baseId === reactive or blank: leave whatever's underneath
      // (sampled reactive vars / :root) plus the user's overrides.
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
    // pass so the swap repaints every surface at once. A named palette
    // normally has no overrides (selecting one resets the slice), but
    // pass the skip set defensively so a preset-seeded override isn't
    // clobbered.
    const theme = findTheme(activeId);
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    clearThemeVars(root, overrideKeys);
    clearReactivePalette(root);
    if (theme) applyTheme(root, theme, mode, overrideKeys);
  }, [activeId, baseId, resolvedTheme, effectiveImage]);

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
      // Clear any prior fork base — picking a real palette is no longer
      // a custom fork.
      update({ activeId: id, baseId: "" });
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
