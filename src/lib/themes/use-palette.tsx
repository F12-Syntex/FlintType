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
import type { ThemeOverrides } from "../theme-customization";
import { useRemotePrefs } from "../use-remote-prefs";
import { EMPTY_OVERRIDES } from "./overrides";
import {
  baselinePaletteId,
  palettePresetSlices,
  paletteSliceFor,
} from "./palette-baseline";
import type { PaletteSlice } from "./palette-fork";
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
  /** The named palette whose presets the settings pages measure
   *  changes against: the active palette, or the one a custom fork came
   *  off. Null for Default and baseless forks (palette-baseline.ts). */
  baselineId: string | null;
  apply: (id: string) => void;
  reset: () => void;
};

/** Re-paint the stored per-var overrides on top of whatever the palette
 *  just painted. Palette vars and overrides share names (`--radius`,
 *  colours), and this effect runs after the overrides hook's own effect
 *  (it's the parent), so without this a pick painted the palette's
 *  `radius` over the preset's `--radius` until the next reload. */
function reassertOverrides(root: HTMLElement) {
  const overrides = readSlice<ThemeOverrides>("theme", EMPTY_OVERRIDES);
  for (const [k, v] of Object.entries(overrides)) {
    if (typeof v === "string" && v) root.style.setProperty(k, v);
  }
}

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
  // Snapshot of the named palette a "custom" fork came off (see
  // palette-fork.ts). Stable reference — only replaced on a new fork —
  // so it's safe as an effect dep without thrashing on unrelated
  // pref-store notifies.
  const base = value.base;
  const { effectiveImage } = useBackgroundPrefs();

  useEffect(() => {
    // Themes paint on <html> so every surface (chrome, typing area,
    // customise previews) picks them up via the CSS cascade. SSR
    // no-op.
    const root = getThemeRoot();
    if (!root) return;

    // "custom" — the user has per-var overrides applied via
    // useThemeOverrides. Don't touch ANY vars: the inline overrides
    // from useThemeOverrides are the source of truth for the keys
    // they cover, and the rest of whatever base palette the user
    // forked from (reactive sample, named theme) should keep
    // painting underneath. Earlier versions called
    // clearReactivePalette() here, which wiped the sampled reactive
    // colours the moment the user nudged a single colour / radius /
    // font scale — read as "changing any value resets the colours".
    if (activeId === CUSTOM_THEME_ID) {
      // A fork off a NAMED palette carries a `base` snapshot — repaint
      // it (for the current mode) so the palette survives reloads and
      // light/dark flips, then re-assert the per-var overrides on top
      // so they keep winning where the names collide. Baseless customs
      // (forked from Default / reactive) keep the old hands-off path.
      if (base) {
        const mode = resolvedTheme === "dark" ? "dark" : "light";
        const vars = mode === "dark" ? base.dark : base.light;
        for (const [k, v] of Object.entries(vars)) {
          if (typeof v === "string" && v) root.style.setProperty(`--${k}`, v);
        }
        reassertOverrides(root);
      }
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
        reassertOverrides(root);
        return;
      }
      let cancelled = false;
      const sampleMode: "light" | "dark" =
        resolvedTheme === "dark" ? "dark" : "light";
      void samplePalette(effectiveImage, sampleMode).then((palette) => {
        if (cancelled || !palette) return;
        clearThemeVars(root);
        applyReactivePalette(root, palette);
        reassertOverrides(root);
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
    if (theme) {
      applyTheme(root, theme, mode);
      // One-time self-heal: users who picked this palette before its vars
      // were persisted have a `palette` slice with no varsLight/varsDark,
      // so they'd still flash the default palette on load. Backfill them
      // straight to storage — the bootstrap reads localStorage, not React
      // state, so this needs no setState (no effect loop). The readSlice
      // guard stops it re-writing once the vars are present.
      const persisted = readSlice<PaletteSlice>("palette", DEFAULT_PALETTE);
      if (persisted.activeId === activeId && persisted.varsLight == null) {
        writeSlice("palette", paletteSliceFor(theme.id));
      }
    }
    reassertOverrides(root);
  }, [activeId, base, resolvedTheme, effectiveImage]);

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
