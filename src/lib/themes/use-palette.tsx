"use client";

import { useTheme as useNextTheme } from "next-themes";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";
import { useBackgroundPrefs } from "../background-prefs";
import { clearSlice, writeSlice } from "../prefs-store";
import type { ThemeOverrides } from "../theme-customization";
import { useRemotePrefs } from "../use-remote-prefs";
import { BACKGROUND_REACTIVE_ID } from "./background-reactive";
import { EMPTY_OVERRIDES, overriddenVars } from "./overrides";
import {
  baselinePaletteId,
  palettePresetSlices,
  paletteSliceFor,
} from "./palette-baseline";
import type { PaletteSlice } from "./palette-fork";
import {
  paintForkBase,
  paintNamed,
  paintReactive,
  type ReactiveSample,
} from "./palette-paint";
import {
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
  /** The palette whose presets the settings pages measure changes
   *  against: the active palette, or the one a custom fork came off
   *  (Background reactive included). Null for Default and baseless
   *  forks (palette-baseline.ts). */
  baselineId: string | null;
  apply: (id: string) => void;
  reset: () => void;
};

// Fresh accounts land on the real Default theme — `activeId: null`, no
// overrides. The brand baseline (the orange --primary / --ring, the
// card radius) now lives in `globals.css :root` / `.dark` as the
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
  // Snapshot of the palette a "custom" fork came off (see
  // palette-fork.ts). Stable reference — only replaced on a new fork —
  // so it's safe as an effect dep without thrashing on unrelated
  // pref-store notifies.
  const base = value.base;
  const { effectiveImage } = useBackgroundPrefs();
  // Which vars carry an override (not their values). Palette vars and
  // overrides share one inline style on <html>, so when an override
  // goes away the effect below repaints the palette's own value for it;
  // value-only changes (a slider drag) don't re-run it.
  const { value: overrides } = useRemotePrefs<ThemeOverrides>(
    "theme",
    EMPTY_OVERRIDES,
  );
  const overriddenKeys = overriddenVars(overrides).sort().join(" ");
  const sampleRef = useRef<ReactiveSample | null>(null);

  useEffect(() => {
    // Themes paint on <html> so every surface (chrome, typing area,
    // customise previews) picks them up via the CSS cascade. SSR
    // no-op. Every painter re-asserts the overrides on top.
    const root = getThemeRoot();
    if (!root) return;
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    // The palette the colours come from: the active one, or the one a
    // "custom" fork came off (palette-fork.ts).
    const origin = activeId === CUSTOM_THEME_ID ? base?.id : activeId;

    // Reactive, or a fork off it: re-sample the background image.
    if (origin === BACKGROUND_REACTIVE_ID) {
      return paintReactive(root, effectiveImage, mode, sampleRef);
    }
    if (activeId === CUSTOM_THEME_ID) {
      // A fork off a named palette repaints its `base` snapshot under
      // the overrides. Baseless forks (off Default, or reactive forks
      // from before the origin was recorded) keep the hands-off path:
      // clearing here would wipe whatever they were painted on.
      if (base) paintForkBase(root, base, mode);
      return;
    }
    paintNamed(root, activeId, mode);
  }, [activeId, base, resolvedTheme, effectiveImage, overriddenKeys]);

  const apply = useCallback(
    (id: string) => {
      // Custom is the synthetic "user has per-var overrides" id —
      // picking it from the menu is a no-op (the overrides are already
      // active on :root) and keeps the fork's `base` snapshot intact.
      if (id === CUSTOM_THEME_ID) {
        update({ activeId: id });
        return;
      }
      // Every other pick owns ONLY the visual-identity slices: colours,
      // geometry, typography (cssVars + the theme-overrides slice) and
      // the keyboard widget. Caret, live stats, tape, lines, result,
      // multiplayer and the rest of the appearance slice are user-owned
      // and survive a switch. What a pick writes comes from
      // palettePresetSlices, the same source the settings pages'
      // baseline reads (palette-baseline.ts).
      const slices = palettePresetSlices(findTheme(id));
      clearSlice("keyboard");
      writeSlice("theme", slices.themeOverrides);
      if (slices.keyboard) writeSlice("keyboard", slices.keyboard);
      // Function form so a stale `base` snapshot (and any prior vars)
      // from a previous custom fork is dropped rather than merged along
      // (update() merges object patches). The named palette's resolved
      // cssVars ride along for the pre-hydration bootstrap (no FOUC).
      update(() => paletteSliceFor(id));
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
      value={{
        themes,
        activeId,
        baselineId: baselinePaletteId(value, CUSTOM_THEME_ID),
        apply,
        reset: resetPalette,
      }}
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
