import type { ThemeOverrides, ThemeVar } from "../theme-customization";
import type { PaletteSlice } from "./palette-fork";

/** Pure logic for the per-CSS-var theme override layer — the colours,
 *  radius, font and word-spacing a user can nudge on the appearance
 *  page on top of whatever palette they're on.
 *
 *  Kept React-free and side-effect-free so it's unit-testable: the
 *  hook (`useThemeOverrides`) is the thin DOM/persistence shell around
 *  these functions. The slice itself is a plain `ThemeOverrides` record;
 *  a var is "overridden" only when it carries a non-empty string. The
 *  default is a TRULY empty record — the brand baseline lives in
 *  `globals.css :root` / `.dark` as the real Default theme, not as a
 *  forced override (see the 2026-05 lobby/theme fix + LEGACY_BAKED_OVERRIDES). */

/** The default for the "theme" prefs slice: no overrides at all. A
 *  fresh account paints purely from `globals.css :root` (the Default
 *  theme). Critically empty — `readSlice` MERGES a slice's default into
 *  every read, so a non-empty default could never be cleared (it'd be
 *  re-merged on the next read), which is exactly the bug this replaces. */
export const EMPTY_OVERRIDES: ThemeOverrides = {};

/** Is `name` actually overridden? Only a non-empty string counts —
 *  `undefined` / `""` mean "fall back to the palette / :root default". */
export function isOverridden(o: ThemeOverrides, name: ThemeVar): boolean {
  const v = o[name];
  return typeof v === "string" && v !== "";
}

/** The vars carrying a real override. Drives the "N customised" count
 *  and the per-row Reset affordance. */
export function overriddenVars(o: ThemeOverrides): ThemeVar[] {
  return (Object.keys(o) as ThemeVar[]).filter((k) => isOverridden(o, k));
}

export function overrideCount(o: ThemeOverrides): number {
  return overriddenVars(o).length;
}

/** Set one var. Returns a new record (never mutates). */
export function setOverride(
  o: ThemeOverrides,
  name: ThemeVar,
  value: string,
): ThemeOverrides {
  return { ...o, [name]: value };
}

/** Clear one var so it falls back to the palette / :root default.
 *  Returns a new record with the key removed entirely (not set to ""),
 *  so `Object.keys` reflects the real override count. */
export function clearOverride(o: ThemeOverrides, name: ThemeVar): ThemeOverrides {
  if (!(name in o)) return o;
  const next = { ...o };
  delete next[name];
  return next;
}

/** Diff the currently-applied inline vars against the next override
 *  record: which to `setProperty` and which to `removeProperty`. The
 *  hook tracks the vars it has written (so it never strips inline vars
 *  set by another layer, e.g. the reactive-palette sampler) and feeds
 *  the prior set in here. */
export function diffAppliedVars(
  prev: ReadonlySet<ThemeVar>,
  o: ThemeOverrides,
): { set: Array<[ThemeVar, string]>; remove: ThemeVar[]; nextKeys: Set<ThemeVar> } {
  const set: Array<[ThemeVar, string]> = [];
  const nextKeys = new Set<ThemeVar>();
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string" && v !== "") {
      set.push([k as ThemeVar, v]);
      nextKeys.add(k as ThemeVar);
    }
  }
  const remove: ThemeVar[] = [];
  for (const v of prev) if (!nextKeys.has(v)) remove.push(v);
  return { set, remove, nextKeys };
}

/* ─── Migration off the pre-2026-05 fake-default state ─────────────── */

/** The exact override values the old default (`EMPTY_OVERRIDES` that
 *  wasn't empty) force-applied over `:root`. These now ARE the Default
 *  theme's `:root` / `.dark` values, so a stored override equal to one
 *  of these is redundant baggage that only makes the var read as
 *  "customised" (a phantom Reset). Stripping it is visually neutral. */
export const LEGACY_BAKED_OVERRIDES: ThemeOverrides = {
  "--primary": "#f97316",
  "--ring": "#fb923c",
  "--radius": "0.5rem",
  "--ft-word-spacing": "0.25em",
};

/** Remove any override whose value equals the legacy baked default
 *  (== the new :root default). Idempotent and visually neutral. */
export function stripLegacyBaked(o: ThemeOverrides): ThemeOverrides {
  let next = o;
  for (const [k, legacy] of Object.entries(LEGACY_BAKED_OVERRIDES)) {
    const key = k as ThemeVar;
    if (next[key] === legacy) {
      if (next === o) next = { ...o };
      delete next[key];
    }
  }
  return next;
}

/** One-shot migration of a user's stored {palette, theme} off the old
 *  fake-default state. Strips the legacy baked overrides; if that
 *  leaves no overrides AND the palette was only "custom" because of
 *  them, demote the palette — back to the fork's base palette when one
 *  was snapshotted (palette-fork.ts), else to Default (null). A custom
 *  fork that still carries real overrides keeps its `base` untouched.
 *  `changed` tells the caller whether to write anything back. Pure —
 *  `customId` is injected so this stays free of the registry import. */
export function migrateThemeState(
  palette: PaletteSlice,
  theme: ThemeOverrides,
  customId: string,
): {
  palette: PaletteSlice;
  theme: ThemeOverrides;
  changed: boolean;
} {
  const cleanedTheme = stripLegacyBaked(theme);
  const themeChanged = cleanedTheme !== theme;
  let activeId = palette.activeId;
  let base = palette.base;
  if (activeId === customId && overrideCount(cleanedTheme) === 0) {
    activeId = base?.id ?? null;
    base = undefined;
  }
  return {
    palette: base ? { activeId, base } : { activeId },
    theme: cleanedTheme,
    changed: themeChanged || activeId !== palette.activeId,
  };
}
