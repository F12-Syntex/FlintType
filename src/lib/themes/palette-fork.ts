import type { ThemeOverrides } from "../theme-customization";
import { BACKGROUND_REACTIVE_ID } from "./background-reactive";
import {
  baselinePaletteId,
  overridesMatchBaseline,
  paletteBaseline,
  paletteSliceFor,
} from "./palette-baseline";
import { findTheme } from "./registry";

/** Pure logic for the "custom" palette fork: when the user nudges any
 *  per-CSS-var override, the palette slice forks to the synthetic
 *  "custom" id, and goes back to the palette it came from once the
 *  overrides match that palette again.
 *
 *  The bug this layer fixes: named palettes used to persist only their
 *  id — their cssVars existed solely as in-session inline styles. The
 *  moment `setVar` pinned the palette slice to "custom", the named
 *  palette's id was gone and on reload nothing re-applied its vars
 *  (PaletteProvider early-returns for "custom" and the pre-hydration
 *  bootstrap replays only `blob.theme`). One nudged slider silently
 *  destroyed the whole palette.
 *
 *  Fix: when forking off a named palette, snapshot BOTH mode var maps
 *  into the slice (`base`) so the fork is self-contained — the
 *  bootstrap script and PaletteProvider can both repaint the base
 *  underneath the user's overrides without consulting the registry.
 *  A fork off Background reactive records only its origin (empty var
 *  maps): its colours are sampled from the background image, so the
 *  provider re-samples them instead. `forkPaletteToCustom` takes the
 *  resolver injected; `resolvePaletteBase`, `paletteAfterOverrideWrite`
 *  and `paletteAfterThemeMigration` read the registry. React-free; see
 *  `palette-fork.test.ts`. */

/** Snapshot of the palette a custom fork is based on. Var names are
 *  stored WITHOUT the `--` prefix, exactly as in a Theme's
 *  `cssVars.light` / `cssVars.dark` (the appliers add the prefix). For
 *  Background reactive both maps are empty: the id records the origin. */
export type PaletteBase = {
  id: string;
  light: Record<string, string>;
  dark: Record<string, string>;
};

/** The persisted "palette" prefs slice. `base` is present only while
 *  `activeId === CUSTOM_THEME_ID` and the fork came off a named palette
 *  or Background reactive; forks off Default (null) carry no base, and
 *  so do reactive forks made before the origin was recorded.
 *
 *  `varsLight` / `varsDark` are the resolved cssVars of the active
 *  *named static* palette (var names WITH the `--` prefix), persisted so
 *  the pre-hydration bootstrap (src/lib/bootstrap.ts) can paint a
 *  community palette on `<html>` BEFORE first paint — otherwise it
 *  flashes the default coral/paper for the first frames on every load
 *  (the FOUC ui-law §9.3 declares load-bearing to prevent). Absent for
 *  Default (null), custom (uses `base` + the theme-overrides slice the
 *  bootstrap already paints), and reactive (sampled async). */
export type PaletteSlice = {
  activeId: string | null;
  base?: PaletteBase;
  varsLight?: Record<string, string>;
  varsDark?: Record<string, string>;
};

/** Fork the palette slice to "custom" because a per-var override was
 *  just set.
 *  - already custom → returned UNCHANGED (same reference) so repeated
 *    setVar calls never re-snapshot or clobber the original base
 *  - Default (null) → plain custom, no base (globals.css :root is the
 *    base and always paints)
 *  - named palette → snapshot its cssVars via `resolveBase` so the
 *    fork survives reloads; Background reactive records its origin;
 *    unresolvable ids (uninstalled) fork without a base */
export function forkPaletteToCustom(
  palette: PaletteSlice,
  resolveBase: (id: string) => PaletteBase | undefined,
  customId: string,
): PaletteSlice {
  if (palette.activeId === customId) return palette;
  if (!palette.activeId) return { activeId: customId };
  const base = resolveBase(palette.activeId);
  return base ? { activeId: customId, base } : { activeId: customId };
}

/** Where the palette slice lands after "reset all overrides".
 *  - custom fork with a base → back to that palette (the user
 *    asked to drop their nudges, not the palette they picked)
 *  - custom with no base → Default
 *  - anything else (named / reactive / Default) → Default, matching the
 *    pre-fork behaviour of the reset affordance */
export function paletteAfterReset(
  palette: PaletteSlice,
  customId: string,
): PaletteSlice {
  if (palette.activeId === customId) {
    return { activeId: palette.base?.id ?? null };
  }
  return { activeId: null };
}

/** The fork base for palette `id`: a named palette's cssVars for both
 *  modes, an origin-only base for Background reactive (its colours are
 *  re-sampled from the image), and undefined for Default, "custom" and
 *  uninstalled ids. */
export function resolvePaletteBase(id: string): PaletteBase | undefined {
  if (id === BACKGROUND_REACTIVE_ID) return { id, light: {}, dark: {} };
  const t = findTheme(id);
  if (!t) return undefined;
  return { id: t.id, light: t.cssVars.light, dark: t.cssVars.dark };
}

/** Where the palette slice lands after one override write (`setVar` /
 *  `clearVar`), so the picker reads "Custom" exactly while the
 *  overrides differ from what the palette itself sets:
 *  - a write that leaves the overrides at the active palette's baseline
 *    (clicking the corner option it already uses, a size nudged back)
 *    keeps the palette: same reference
 *  - a write that departs from it forks to Custom (`forkPaletteToCustom`)
 *  - a Custom fork whose overrides are back at its baseline returns to
 *    the palette it came off, or to Default when it has no base (the
 *    same landing as a page Reset, `paletteAfterRestore`)
 *  - a Custom fork whose base is no longer installed keeps painting
 *    its snapshot: same reference */
export function paletteAfterOverrideWrite(
  palette: PaletteSlice,
  overrides: ThemeOverrides,
  customId: string,
): PaletteSlice {
  const baseline = paletteBaseline(
    findTheme(baselinePaletteId(palette, customId)),
  ).themeOverrides;
  const matches = overridesMatchBaseline(overrides, baseline);
  if (palette.activeId !== customId) {
    return matches
      ? palette
      : forkPaletteToCustom(palette, resolvePaletteBase, customId);
  }
  if (!matches) return palette;
  const baseId = palette.base?.id;
  if (!baseId) return paletteSliceFor(null);
  return resolvePaletteBase(baseId) ? paletteSliceFor(baseId) : palette;
}

/** Where the palette slice lands after the load-time theme migration
 *  (`migrateThemeState`) cleaned the stored overrides to `overrides`.
 *  That migration demotes a Custom fork once no overrides are left,
 *  which is wrong for a fork off a palette with presets: Size at 100%
 *  on Bold Tech leaves no overrides yet still differs from Bold Tech.
 *  So a Custom fork settles by the override-write rule instead, and the
 *  picker reads the same before and after a reload. The migration never
 *  moves any other palette, so the stored slice is kept as it is. */
export function paletteAfterThemeMigration(
  stored: PaletteSlice,
  overrides: ThemeOverrides,
  customId: string,
): PaletteSlice {
  if (stored.activeId !== customId) return stored;
  return paletteAfterOverrideWrite(stored, overrides, customId);
}
