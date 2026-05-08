import type { AppearancePrefs } from "../appearance-prefs";
import type { CaretSettings } from "../caret-settings";
import type { ThemeVar } from "../theme-customization";

/** Hand-curated full appearance bundle per shipped theme. Themes own
 *  the user's *whole* visual identity, not just colour — when a theme
 *  is applied, the palette provider clears the user's caret /
 *  appearance / theme-override slices and writes these on top.
 *
 *  Authoring guidance:
 *  - Pick values that match the theme's character. Cyberpunk should
 *    feel sharp (block caret, no fade). Kodama Grove should feel
 *    quiet (line caret, soft fade, hidden borders). Twitter should
 *    feel familiar.
 *  - Leave fields out (rather than write defaults) when the global
 *    default is already the right pick. Smaller diffs read better.
 *  - `themeOverrides` is for passage-scoped CSS vars
 *    (--ft-font-family, --ft-passage-typed, --radius, etc.) that the
 *    theme's `cssVars` block can't address. Only set what the theme
 *    cares about. */
export type ThemePreset = {
  appearance?: Partial<AppearancePrefs>;
  caret?: Partial<CaretSettings>;
  themeOverrides?: Partial<Record<ThemeVar, string>>;
};

export const THEME_PRESETS: Record<string, ThemePreset> = {
  "amethyst-haze": {
    // Soft, considered. Slim caret with a slow drift, fade-out for
    // typed words, hairline borders.
    caret: { style: "line", width: 1, radius: 1, smoothSpeed: 280 },
    appearance: {
      highlightMode: "letter",
      typedEffect: "fade",
      borders: "soft",
      linesRendered: 3,
      maxLineWidth: 80,
      smoothLineScroll: true,
    },
  },

  "bold-tech": {
    // Confident and geometric. Block caret, next-word highlight to
    // signal upcoming work, no chrome borders to keep the focus on
    // the passage.
    caret: { style: "block", width: 2, radius: 0, smoothSpeed: 180 },
    appearance: {
      highlightMode: "next-word",
      typedEffect: "off",
      borders: "hidden",
      linesRendered: 4,
      maxLineWidth: 0,
      smoothLineScroll: true,
    },
    themeOverrides: { "--ft-font-scale": "1.05" },
  },

  bubblegum: {
    // Playful pink. Rounded block caret, word-level highlight,
    // strike-through past words for a chewy "did the work" feel.
    caret: { style: "block", width: 2, radius: 4, smoothSpeed: 220 },
    appearance: {
      highlightMode: "word",
      typedEffect: "strike",
      borders: "default",
      linesRendered: 3,
      maxLineWidth: 60,
      smoothLineScroll: true,
    },
    themeOverrides: { "--ft-font-scale": "1.1", "--ft-word-spacing": "0.45em" },
  },

  catppuccin: {
    // Muted dev-friendly palette. Hairline caret, letter highlight,
    // fade for past words, soft hairlines.
    caret: { style: "line", width: 2, radius: 1, smoothSpeed: 250 },
    appearance: {
      highlightMode: "letter",
      typedEffect: "fade",
      borders: "soft",
      linesRendered: 3,
      maxLineWidth: 70,
      smoothLineScroll: true,
    },
  },

  claymorphism: {
    // Soft 3D-ish. Rounded line caret, next-letter ring on the
    // upcoming key for a tactile "press here" feel.
    caret: { style: "line", width: 3, radius: 4, smoothSpeed: 320 },
    appearance: {
      highlightMode: "next-letter",
      typedEffect: "fade",
      borders: "soft",
      linesRendered: 4,
      maxLineWidth: 80,
      smoothLineScroll: true,
    },
    themeOverrides: { "--radius": "0.75rem" },
  },

  "cosmic-night": {
    // Deep dark. Underline caret keeps the eye low, letter highlight
    // adds rhythm, strike past words feels appropriate to a night
    // session.
    caret: { style: "underline", width: 2, radius: 0, smoothSpeed: 220 },
    appearance: {
      highlightMode: "letter",
      typedEffect: "strike",
      borders: "hidden",
      linesRendered: 5,
      maxLineWidth: 100,
      smoothLineScroll: true,
    },
  },

  cyberpunk: {
    // Hot neon. Block caret, word-level highlight, no fade — every
    // letter stays vivid. Borders dropped so colour does the work.
    caret: { style: "block", width: 2, radius: 0, smoothSpeed: 140 },
    appearance: {
      highlightMode: "word",
      typedEffect: "off",
      borders: "hidden",
      linesRendered: 3,
      maxLineWidth: 60,
      smoothLineScroll: false,
      tapeMode: "off",
    },
    themeOverrides: { "--ft-font-scale": "1.1" },
  },

  "kodama-grove": {
    // Quiet, forest-floor minimal. Slimmest caret, fade past words,
    // borders gone, slightly smaller passage font.
    caret: { style: "line", width: 1, radius: 0, smoothSpeed: 320 },
    appearance: {
      highlightMode: "letter",
      typedEffect: "fade",
      borders: "hidden",
      linesRendered: 4,
      maxLineWidth: 80,
      smoothLineScroll: true,
    },
    themeOverrides: { "--ft-font-scale": "0.95" },
  },

  "light-green": {
    // Gentle. Line caret, next-word emphasis to stay forward-looking,
    // hairline borders.
    caret: { style: "line", width: 2, radius: 1, smoothSpeed: 260 },
    appearance: {
      highlightMode: "next-word",
      typedEffect: "fade",
      borders: "soft",
      linesRendered: 3,
      maxLineWidth: 80,
      smoothLineScroll: true,
    },
  },

  tangerine: {
    // Warm and playful. Block caret with a corner radius, letter
    // highlight, no fade, default borders.
    caret: { style: "block", width: 2, radius: 3, smoothSpeed: 200 },
    appearance: {
      highlightMode: "letter",
      typedEffect: "off",
      borders: "default",
      linesRendered: 3,
      maxLineWidth: 70,
      smoothLineScroll: true,
    },
    themeOverrides: { "--ft-font-scale": "1.05" },
  },

  twitter: {
    // Clean and familiar. Line caret, letter highlight, no fx, soft
    // borders. Stays close to defaults so the user feels at home.
    caret: { style: "line", width: 2, radius: 0, smoothSpeed: 250 },
    appearance: {
      highlightMode: "letter",
      typedEffect: "off",
      borders: "soft",
      linesRendered: 4,
      maxLineWidth: 80,
      smoothLineScroll: true,
    },
  },
};
