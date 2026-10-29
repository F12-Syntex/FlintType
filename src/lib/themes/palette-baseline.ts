import { DEFAULT_KEYBOARD, type KeyboardSettings } from "../keyboard-settings";
import type { ThemeOverrides, ThemeVar } from "../theme-customization";
import { effectiveOverride, stripLegacyBaked } from "./overrides";
import type { PaletteSlice } from "./palette-fork";
import { findTheme, prefixCssVars, type Theme } from "./registry";

/** Pure logic for "what does the active palette itself set?".
 *
 *  Picking a palette writes its curated presets (`presets.ts`) into the
 *  keyboard slice and the theme-overrides slice. Those values belong to
 *  the palette, not to the user, so the settings pages measure the
 *  user's changes against the palette's BASELINE: the defaults with the
 *  palette's applied presets on top. A page's "Reset (N)" counts only
 *  real departures from it, and Reset restores it.
 *
 *  `palettePresetSlices` is the single source for what a pick writes;
 *  `use-palette.tsx` applies it and `paletteBaseline` mirrors it, so the
 *  two can't drift. A preset's `caret` / `appearance` fields are never
 *  applied (see presets.ts), so they are not part of the baseline.
 *
 *  React-free and side-effect-free; see `palette-baseline.test.ts`. */

type PresetSource = Pick<Theme, "presets"> | undefined;

/** The slices a palette pick writes. `themeOverrides` leaves out values
 *  that only restate a default: the legacy baked set the load-time theme
 *  migration strips on a named palette (so the stored record keeps its
 *  shape on reload; the baked colours stay, as they do there) and the
 *  typography vars at their :root fallback (`effectiveOverride`). */
export function palettePresetSlices(theme: PresetSource): {
  keyboard?: Partial<KeyboardSettings>;
  themeOverrides: ThemeOverrides;
} {
  const themeOverrides = stripLegacyBaked(
    { ...(theme?.presets?.themeOverrides ?? {}) },
    { keepColours: true },
  );
  for (const name of Object.keys(themeOverrides) as ThemeVar[]) {
    if (effectiveOverride(name, themeOverrides[name]) === undefined) {
      delete themeOverrides[name];
    }
  }
  const keyboard = theme?.presets?.keyboard;
  return keyboard ? { keyboard: { ...keyboard }, themeOverrides } : { themeOverrides };
}

export type PaletteBaseline = {
  /** Every keyboard setting as the palette leaves it. */
  keyboard: KeyboardSettings;
  /** The theme overrides the palette writes (absent = not set). */
  themeOverrides: ThemeOverrides;
};

/** Defaults overlaid with the palette's applied presets. Default,
 *  reactive and unknown palettes have none, so their baseline is the
 *  bare defaults. */
export function paletteBaseline(theme: PresetSource): PaletteBaseline {
  const slices = palettePresetSlices(theme);
  return {
    keyboard: { ...DEFAULT_KEYBOARD, ...(slices.keyboard ?? {}) },
    themeOverrides: slices.themeOverrides,
  };
}

/** The palette whose presets set the baseline: the active palette, or
 *  the palette a custom fork came off (null for Default and for a fork
 *  without a base). Background reactive has no presets, so its baseline
 *  is the bare defaults. */
export function baselinePaletteId(
  palette: PaletteSlice,
  customId: string,
): string | null {
  if (palette.activeId === customId) return palette.base?.id ?? null;
  return palette.activeId;
}

/** The persisted palette slice for picking `id`. Registry palettes carry
 *  their resolved vars so the pre-paint bootstrap can paint them; Default
 *  is `{ activeId: null }`, synthetic ids (reactive) are bare. */
export function paletteSliceFor(id: string | null): PaletteSlice {
  if (id === null) return { activeId: null };
  const named = findTheme(id);
  if (!named) return { activeId: id };
  return {
    activeId: id,
    varsLight: prefixCssVars(named.cssVars.light),
    varsDark: prefixCssVars(named.cssVars.dark),
  };
}

/** One override's value as compared: unset, "" and a typography var at
 *  its :root fallback ("1.0") all mean "not set" (`effectiveOverride`). */
function valueOf(o: ThemeOverrides, name: ThemeVar): string | undefined {
  return effectiveOverride(name, o[name]);
}

/** How many of `vars` differ from the palette's baseline. */
export function countVarsOffBaseline(
  overrides: ThemeOverrides,
  baseline: ThemeOverrides,
  vars: readonly ThemeVar[],
): number {
  return vars.reduce(
    (n, v) => n + (valueOf(overrides, v) !== valueOf(baseline, v) ? 1 : 0),
    0,
  );
}

/** A new overrides record with each of `vars` put back to the baseline
 *  (set to the palette's value, or removed when the palette sets none).
 *  Every other var is left as it is. */
export function restoreVarsToBaseline(
  overrides: ThemeOverrides,
  baseline: ThemeOverrides,
  vars: readonly ThemeVar[],
): ThemeOverrides {
  const next: ThemeOverrides = { ...overrides };
  for (const v of vars) {
    if (valueOf(baseline, v) === undefined) delete next[v];
    else next[v] = baseline[v];
  }
  return next;
}

/** Do the overrides equal the baseline across every var either sets? */
export function overridesMatchBaseline(
  overrides: ThemeOverrides,
  baseline: ThemeOverrides,
): boolean {
  const keys = new Set([
    ...Object.keys(overrides),
    ...Object.keys(baseline),
  ] as ThemeVar[]);
  return countVarsOffBaseline(overrides, baseline, [...keys]) === 0;
}

/** Would switching palette throw away anything the user changed? A
 *  switch rewrites the whole theme-overrides slice and the keyboard
 *  slice, so it loses something only when either differs from what the
 *  current palette set. */
export function switchDiscardsChanges(
  overrides: ThemeOverrides,
  keyboard: KeyboardSettings,
  baseline: PaletteBaseline,
): boolean {
  if (!overridesMatchBaseline(overrides, baseline.themeOverrides)) return true;
  return (Object.keys(DEFAULT_KEYBOARD) as (keyof KeyboardSettings)[]).some(
    (k) => keyboard[k] !== baseline.keyboard[k],
  );
}

/** Where the palette slice lands after a page restored some vars. A
 *  custom fork whose overrides are back to its base palette's baseline
 *  is that palette again, so it goes back to it (or to Default when it
 *  had no base). Anything else is returned unchanged (same reference). */
export function paletteAfterRestore(
  palette: PaletteSlice,
  overrides: ThemeOverrides,
  baseline: ThemeOverrides,
  customId: string,
): PaletteSlice {
  if (palette.activeId !== customId) return palette;
  if (!overridesMatchBaseline(overrides, baseline)) return palette;
  return paletteSliceFor(palette.base?.id ?? null);
}

/** What a palette pick should do. Re-picking the active palette is a
 *  no-op (applying it again would still rewrite its slices). A switch
 *  that loses nothing, or one the user said not to warn about, applies
 *  at once; anything else asks first. */
export type PaletteSwitchDecision = "noop" | "apply" | "confirm";

export function paletteSwitchDecision({
  targetId,
  activeId,
  discardsChanges,
  skipConfirm,
}: {
  /** The palette picked; null is Default. */
  targetId: string | null;
  activeId: string | null;
  discardsChanges: boolean;
  skipConfirm: boolean;
}): PaletteSwitchDecision {
  if (targetId === activeId) return "noop";
  if (!discardsChanges || skipConfirm) return "apply";
  return "confirm";
}
