import { readSlice, writeSlice } from "../prefs-store";
import type { ThemeOverrides } from "../theme-customization";
import {
  applyReactivePalette,
  clearReactivePalette,
  type ReactivePalette,
  samplePalette,
} from "./background-reactive";
import { EMPTY_OVERRIDES } from "./overrides";
import { paletteSliceFor } from "./palette-baseline";
import type { PaletteBase, PaletteSlice } from "./palette-fork";
import { applyTheme, clearThemeVars, findTheme } from "./registry";

/** How PaletteProvider paints the palette layer on `<html>`. Palette
 *  vars and the per-var overrides share one inline style, so every
 *  painter ends by re-asserting the stored overrides on top, and the
 *  provider re-runs these whenever the set of overridden vars changes:
 *  removing an override then uncovers the palette's own value instead
 *  of the bare `:root` default. See `palette-paint.test.ts`. */

export type PaintMode = "light" | "dark";

/** The last sampled reactive palette, so a repaint for the same image
 *  and mode (a fork off Background reactive, an override removed) is
 *  synchronous instead of waiting on a fresh sample. */
export type ReactiveSample = {
  image: string;
  mode: PaintMode;
  palette: ReactivePalette;
};

/** Re-paint the stored per-var overrides on top of whatever the palette
 *  just painted. Palette vars and overrides share names (`--radius`,
 *  colours), and the provider's effect runs after the overrides hook's
 *  own effect (it's the parent), so without this a pick painted the
 *  palette's `radius` over the preset's `--radius` until the next
 *  reload. */
export function reassertOverrides(root: HTMLElement) {
  const overrides = readSlice<ThemeOverrides>("theme", EMPTY_OVERRIDES);
  for (const [k, v] of Object.entries(overrides)) {
    if (typeof v === "string" && v) root.style.setProperty(k, v);
  }
}

/** A named palette, or Default when `id` resolves to nothing. Clear and
 *  apply in one pass so the swap repaints every surface at once. */
export function paintNamed(root: HTMLElement, id: string | null, mode: PaintMode) {
  const theme = findTheme(id);
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
    const persisted = readSlice<PaletteSlice>("palette", { activeId: null });
    if (persisted.activeId === theme.id && persisted.varsLight == null) {
      writeSlice("palette", paletteSliceFor(theme.id));
    }
  }
  reassertOverrides(root);
}

/** A custom fork off a named palette: repaint its `base` snapshot for
 *  the current mode so the palette survives reloads and light/dark
 *  flips, with the overrides on top. Nothing is cleared first, so the
 *  rest of the page never flashes. */
export function paintForkBase(root: HTMLElement, base: PaletteBase, mode: PaintMode) {
  const vars = mode === "dark" ? base.dark : base.light;
  for (const [k, v] of Object.entries(vars)) {
    if (typeof v === "string" && v) root.style.setProperty(`--${k}`, v);
  }
  reassertOverrides(root);
}

/** Background reactive, or a custom fork off it: the palette sampled
 *  from the background image, with the overrides on top. A cached
 *  sample for the same image and mode paints at once; otherwise the
 *  prior palette stays up until the new sample resolves and swaps in
 *  one paint (clearing first would flash the default palette). Returns
 *  the effect cleanup that drops a sample landing after a re-run. */
export function paintReactive(
  root: HTMLElement,
  image: string | null | undefined,
  mode: PaintMode,
  cache: { current: ReactiveSample | null },
): (() => void) | undefined {
  if (!image) {
    clearThemeVars(root);
    clearReactivePalette(root);
    reassertOverrides(root);
    return undefined;
  }
  const paint = (palette: ReactivePalette) => {
    clearThemeVars(root);
    applyReactivePalette(root, palette);
    reassertOverrides(root);
  };
  const hit = cache.current;
  if (hit && hit.image === image && hit.mode === mode) {
    paint(hit.palette);
    return undefined;
  }
  let cancelled = false;
  void samplePalette(image, mode).then((palette) => {
    if (!palette) return;
    // Still a valid sample for its image and mode, so cache it even
    // when a re-run means it's no longer the one to paint.
    cache.current = { image, mode, palette };
    if (!cancelled) paint(palette);
  });
  return () => {
    cancelled = true;
  };
}
