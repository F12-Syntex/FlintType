/** Pure logic for forking a named palette into the synthetic "custom"
 *  palette when the user nudges any per-CSS-var override.
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
 *  Kept React-free and registry-free (the resolver is injected) so it's
 *  unit-testable; see `palette-fork.test.ts`. */

/** Snapshot of the named palette a custom fork is based on. Var names
 *  are stored WITHOUT the `--` prefix, exactly as in a Theme's
 *  `cssVars.light` / `cssVars.dark` (the appliers add the prefix). */
export type PaletteBase = {
  id: string;
  light: Record<string, string>;
  dark: Record<string, string>;
};

/** The persisted "palette" prefs slice. `base` is present only while
 *  `activeId === CUSTOM_THEME_ID` and the fork came off a named
 *  palette; Default (null) and reactive forks carry no base.
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
 *    fork survives reloads; unresolvable ids (reactive, uninstalled)
 *    fork without a base, preserving prior behaviour */
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
 *  - custom fork off a named palette → back to that palette (the user
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
