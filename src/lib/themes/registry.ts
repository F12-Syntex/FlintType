import type { AppearancePrefs } from "../appearance-prefs";
import type { CaretSettings } from "../caret-settings";
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
  };
};

export const THEMES: readonly Theme[] = data as Theme[];

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
 *  away from the active theme so its colors don't bleed into the next. */
export function clearThemeVars(root: HTMLElement) {
  for (const k of ALL_VAR_NAMES) root.style.removeProperty(`--${k}`);
}

export function applyTheme(root: HTMLElement, theme: Theme, mode: "light" | "dark") {
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
