import type { AppearancePrefs } from "../appearance-prefs";
import type { CaretSettings } from "../caret-settings";
import type { KeyboardSettings } from "../keyboard-settings";
import type { ThemeVar } from "../theme-customization";
import { THEME_PRESETS } from "./presets";
import data from "./themes.json";

/** A user-installable theme — one block of CSS variables for light, one
 *  for dark. Sourced from a shadcn / tweakcn registry URL via
 *  `yarn themes:add <url>`.
 *
 *  Themes own the user's *whole* appearance, not just colour. When
 *  applied, the palette provider also wipes the caret + appearance
 *  prefs slices so the new theme starts from a clean slate. A theme
 *  may overlay its own non-default values via `presets`; absent fields
 *  fall back to the global DEFAULT_CARET / DEFAULT_APPEARANCE. None of
 *  the shipped tweakcn themes carry presets — they're pure colour
 *  palettes. Hand-curated themes can opt in. */
export type Theme = {
  id: string;
  name: string;
  source?: string;
  cssVars: {
    theme?: Record<string, string>;
    light: Record<string, string>;
    dark: Record<string, string>;
  };
  presets?: {
    appearance?: Partial<AppearancePrefs>;
    caret?: Partial<CaretSettings>;
    keyboard?: Partial<KeyboardSettings>;
    /** Per-CSS-var overrides written to the "theme" slice on apply.
     *  Lets a theme drive practice-passage colour/font/radius without
     *  mutating cssVars (which targets the chrome, not just the
     *  passage). Curated per-theme; see `themes/presets.ts`. */
    themeOverrides?: Partial<Record<ThemeVar, string>>;
  };
};

/** Bind curated presets onto each theme on module load. The
 *  themes.json file is mechanically generated from tweakcn imports
 *  and only carries colour/font cssVars; the hand-curated character
 *  per theme (caret style, highlight mode, line counts, …) lives
 *  alongside in `presets.ts` so the JSON stays regenerable. */
export const THEMES: readonly Theme[] = (data as Theme[]).map((t) => {
  const preset = THEME_PRESETS[t.id];
  if (!preset) return t;
  return { ...t, presets: preset };
});

export const STORAGE_KEY = "ft-theme-id";

/** Synthetic palette id reserved for "the user has customised colours
 *  outside any installed theme". Set automatically when:
 *    - the user changes any colour via the appearance page
 *    - a Monkeytype import writes any --background / --foreground / etc.
 *      override
 *  PaletteProvider treats this id as a no-op (don't apply or clear any
 *  theme vars — the inline overrides from useThemeOverrides win on
 *  their own); the picker UI surfaces it as a "Custom" entry. */
export const CUSTOM_THEME_ID = "custom";

const ALL_VAR_NAMES: readonly string[] = (() => {
  const set = new Set<string>();
  for (const t of THEMES) {
    for (const k of Object.keys(t.cssVars.light)) set.add(k);
    for (const k of Object.keys(t.cssVars.dark)) set.add(k);
  }
  return [...set];
})();

/** Strip every var any installed theme can set — used when switching
 *  away from the active theme so its colors don't bleed into the next.
 *  No-op on null so callers can pipe `findThemeScope()` straight in
 *  without manual guards (themes are scoped to a marker element that
 *  only exists on typing surfaces — see `THEME_SCOPE_ATTR`). */
export function clearThemeVars(root: HTMLElement | null) {
  if (!root) return;
  for (const k of ALL_VAR_NAMES) root.style.removeProperty(`--${k}`);
}

export function applyTheme(
  root: HTMLElement | null,
  theme: Theme,
  mode: "light" | "dark",
) {
  if (!root) return;
  clearThemeVars(root);
  const vars = mode === "dark" ? theme.cssVars.dark : theme.cssVars.light;
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(`--${k}`, v);
  }
}

export function findTheme(id: string | null | undefined): Theme | undefined {
  if (!id) return undefined;
  return THEMES.find((t) => t.id === id);
}

/** Marker attribute on the element that should receive theme CSS
 *  variables. Only typing-test surfaces (practice / race / future
 *  drills) carry this; other pages (profile, leaderboard, customise
 *  preview, …) intentionally don't — the user's chosen palette would
 *  drown the editorial chrome there, and on the customise page would
 *  change the very surface the user is using to pick the theme. */
export const THEME_SCOPE_ATTR = "data-ft-theme-scope";

/** Resolve the currently-mounted theme-scope element. Returns null
 *  when the active route isn't a typing surface — callers should
 *  no-op rather than fall back to `<html>` (the whole point of
 *  scoping is to keep chrome / non-typing pages on the default
 *  palette). */
export function findThemeScope(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(`[${THEME_SCOPE_ATTR}]`);
}
