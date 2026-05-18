import type { AppearancePrefs } from "../appearance-prefs";
import type { CaretSettings } from "../caret-settings";
import type { KeyboardSettings } from "../keyboard-settings";
import type { ThemeVar } from "../theme-customization";

/** Hand-curated bundle per shipped theme. Themes own the
 *  *visual-identity* slices only — colours, geometry, typography
 *  (via cssVars + themeOverrides) and the keyboard widget. Caret
 *  and the rest of the appearance slice (live stats, tape, lines,
 *  result, multiplayer, …) are user-owned and intentionally survive
 *  a theme switch.
 *
 *  The `caret` and `appearance` fields on this type are kept for
 *  legacy preset shape and are ignored at apply time
 *  (see use-palette.tsx `apply`). New preset work should populate
 *  `keyboard` + `themeOverrides` only. */
export type ThemePreset = {
  /** @deprecated — ignored at apply time. See file docstring. */
  appearance?: Partial<AppearancePrefs>;
  /** @deprecated — ignored at apply time. See file docstring. */
  caret?: Partial<CaretSettings>;
  keyboard?: Partial<KeyboardSettings>;
  themeOverrides?: Partial<Record<ThemeVar, string>>;
};

/** Shorthand to keep each per-theme record terse. The fields below
 *  are the ones every theme defines — picking distinct values for
 *  each gives the theme a coherent character beyond colour alone. */

export const THEME_PRESETS: Record<string, ThemePreset> = {
  // Soft purples, considered. Slim caret with a slow drift, fade-out
  // typed words, hairline borders, outline keys for the airy feel.
  "amethyst-haze": {
    caret: { style: "line", width: 1, radius: 1, blinkSpeed: 0, smoothSpeed: 280 },
    appearance: {
      highlightMode: "letter",
      typedEffect: "fade",
      tapeMode: "off",
      tapeMargin: 50,
      smoothLineScroll: true,
      linesRendered: 3,
      maxLineWidth: 80,
      borders: "soft",
      liveProgressStyle: "text",
      liveSpeedStyle: "text",
      liveAccuracyStyle: "text",
      liveBurstStyle: "off",
      liveStatsOpacity: 0.9,
      alwaysShowDecimal: false,
      typingSpeedUnit: "wpm",
      startGraphsAtZero: true,
      keymap: "next",
      keymapStyle: "staggered",
      keymapLegend: "lowercase",
      keymapTopRow: "layout",
      keymapSize: 1.0,
    },
    keyboard: {
      design: "outline",
      shape: "rounded",
      compact: false,
      highlightHomeRow: false,
      showShiftLabels: true,
    },
    themeOverrides: { "--ft-font-scale": "1.0", "--ft-word-spacing": "0.25em" },
  },

  // Confident geometric. Block caret, next-word highlight to surface
  // upcoming work, no chrome borders, square solid keys.
  "bold-tech": {
    caret: { style: "block", width: 2, radius: 0, blinkSpeed: 0, smoothSpeed: 180 },
    appearance: {
      highlightMode: "next-word",
      typedEffect: "off",
      tapeMode: "off",
      tapeMargin: 50,
      smoothLineScroll: true,
      linesRendered: 4,
      maxLineWidth: 0,
      borders: "hidden",
      liveProgressStyle: "text",
      liveSpeedStyle: "text",
      liveAccuracyStyle: "text",
      liveBurstStyle: "text",
      liveStatsOpacity: 1,
      alwaysShowDecimal: true,
      typingSpeedUnit: "wpm",
      startGraphsAtZero: false,
      keymap: "next",
      keymapStyle: "matrix",
      keymapLegend: "uppercase",
      keymapTopRow: "always",
      keymapSize: 1.05,
    },
    keyboard: {
      design: "solid",
      shape: "square",
      compact: false,
      highlightHomeRow: true,
      showShiftLabels: false,
    },
    themeOverrides: { "--ft-font-scale": "1.05", "--ft-word-spacing": "0.25em" },
  },

  // Playful pink. Rounded block caret, word-level highlight, strike
  // past words for a chewy "did the work" feel, lifted pill keys.
  bubblegum: {
    caret: { style: "block", width: 2, radius: 4, blinkSpeed: 0, smoothSpeed: 220 },
    appearance: {
      highlightMode: "word",
      typedEffect: "strike",
      tapeMode: "off",
      tapeMargin: 50,
      smoothLineScroll: true,
      linesRendered: 3,
      maxLineWidth: 60,
      borders: "default",
      liveProgressStyle: "mini",
      liveSpeedStyle: "mini",
      liveAccuracyStyle: "mini",
      liveBurstStyle: "off",
      liveStatsOpacity: 1,
      alwaysShowDecimal: false,
      typingSpeedUnit: "wpm",
      startGraphsAtZero: true,
      keymap: "react",
      keymapStyle: "staggered",
      keymapLegend: "lowercase",
      keymapTopRow: "layout",
      keymapSize: 1.05,
    },
    keyboard: {
      design: "lifted",
      shape: "pill",
      compact: false,
      highlightHomeRow: true,
      showShiftLabels: true,
    },
    themeOverrides: { "--ft-font-scale": "1.1", "--ft-word-spacing": "0.45em" },
  },

  // Muted dev-friendly. Hairline caret, letter highlight, fade past
  // words, soft hairlines, outline rounded keys — quiet and
  // considered.
  catppuccin: {
    caret: { style: "line", width: 2, radius: 1, blinkSpeed: 0, smoothSpeed: 250 },
    appearance: {
      highlightMode: "letter",
      typedEffect: "fade",
      tapeMode: "off",
      tapeMargin: 50,
      smoothLineScroll: true,
      linesRendered: 3,
      maxLineWidth: 70,
      borders: "soft",
      liveProgressStyle: "text",
      liveSpeedStyle: "text",
      liveAccuracyStyle: "text",
      liveBurstStyle: "off",
      liveStatsOpacity: 0.9,
      alwaysShowDecimal: false,
      typingSpeedUnit: "wpm",
      startGraphsAtZero: true,
      keymap: "next",
      keymapStyle: "staggered",
      keymapLegend: "lowercase",
      keymapTopRow: "layout",
      keymapSize: 1.0,
    },
    keyboard: {
      design: "outline",
      shape: "rounded",
      compact: false,
      highlightHomeRow: false,
      showShiftLabels: true,
    },
    themeOverrides: { "--ft-font-scale": "1.0", "--ft-word-spacing": "0.25em" },
  },

  // Soft 3D-ish. Rounded line caret, next-letter ring on the
  // upcoming key for tactile "press here" feel, lifted rounded keys
  // and a generous corner radius across the chrome.
  claymorphism: {
    caret: { style: "line", width: 3, radius: 4, blinkSpeed: 0, smoothSpeed: 320 },
    appearance: {
      highlightMode: "next-letter",
      typedEffect: "fade",
      tapeMode: "off",
      tapeMargin: 50,
      smoothLineScroll: true,
      linesRendered: 4,
      maxLineWidth: 80,
      borders: "soft",
      liveProgressStyle: "text",
      liveSpeedStyle: "text",
      liveAccuracyStyle: "text",
      liveBurstStyle: "off",
      liveStatsOpacity: 1,
      alwaysShowDecimal: false,
      typingSpeedUnit: "wpm",
      startGraphsAtZero: true,
      keymap: "next",
      keymapStyle: "staggered",
      keymapLegend: "lowercase",
      keymapTopRow: "layout",
      keymapSize: 1.05,
    },
    keyboard: {
      design: "lifted",
      shape: "rounded",
      compact: false,
      highlightHomeRow: true,
      showShiftLabels: true,
    },
    themeOverrides: {
      "--radius": "0.75rem",
      "--ft-font-scale": "1.05",
      "--ft-word-spacing": "0.3em",
    },
  },

  // Deep dark. Underline caret keeps the eye low, letter highlight
  // adds rhythm, strike past words feels appropriate to a night
  // session, glass keys with soft blur.
  "cosmic-night": {
    caret: { style: "underline", width: 2, radius: 0, blinkSpeed: 0, smoothSpeed: 220 },
    appearance: {
      highlightMode: "letter",
      typedEffect: "strike",
      tapeMode: "off",
      tapeMargin: 50,
      smoothLineScroll: true,
      linesRendered: 5,
      maxLineWidth: 100,
      borders: "hidden",
      liveProgressStyle: "text",
      liveSpeedStyle: "text",
      liveAccuracyStyle: "text",
      liveBurstStyle: "text",
      liveStatsOpacity: 0.85,
      alwaysShowDecimal: false,
      typingSpeedUnit: "wpm",
      startGraphsAtZero: true,
      keymap: "next",
      keymapStyle: "split",
      keymapLegend: "lowercase",
      keymapTopRow: "layout",
      keymapSize: 1.0,
    },
    keyboard: {
      design: "glass",
      shape: "rounded",
      compact: false,
      highlightHomeRow: false,
      showShiftLabels: true,
    },
    themeOverrides: { "--ft-font-scale": "1.0", "--ft-word-spacing": "0.3em" },
  },

  // Hot neon. Block caret, word-level highlight, no fade — every
  // letter stays vivid. Borders dropped, square outline keys, no
  // line-scroll smoothing for that arcade-snap feel.
  cyberpunk: {
    caret: { style: "block", width: 2, radius: 0, blinkSpeed: 600, smoothSpeed: 140 },
    appearance: {
      highlightMode: "word",
      typedEffect: "off",
      tapeMode: "off",
      tapeMargin: 50,
      smoothLineScroll: false,
      linesRendered: 3,
      maxLineWidth: 60,
      borders: "hidden",
      liveProgressStyle: "flash",
      liveSpeedStyle: "text",
      liveAccuracyStyle: "text",
      liveBurstStyle: "flash",
      liveStatsOpacity: 1,
      alwaysShowDecimal: true,
      typingSpeedUnit: "wpm",
      startGraphsAtZero: false,
      keymap: "react",
      keymapStyle: "matrix",
      keymapLegend: "uppercase",
      keymapTopRow: "always",
      keymapSize: 1.1,
    },
    keyboard: {
      design: "outline",
      shape: "square",
      compact: false,
      highlightHomeRow: true,
      showShiftLabels: true,
    },
    themeOverrides: {
      "--ft-font-scale": "1.1",
      "--ft-word-spacing": "0.25em",
      "--radius": "0rem",
    },
  },

  // Quiet, forest-floor minimal. Slimmest caret, fade past words,
  // borders gone, slightly smaller passage font, ghost keys (compact
  // for less visual weight).
  "kodama-grove": {
    caret: { style: "line", width: 1, radius: 0, blinkSpeed: 0, smoothSpeed: 320 },
    appearance: {
      highlightMode: "letter",
      typedEffect: "fade",
      tapeMode: "off",
      tapeMargin: 50,
      smoothLineScroll: true,
      linesRendered: 4,
      maxLineWidth: 80,
      borders: "hidden",
      liveProgressStyle: "text",
      liveSpeedStyle: "off",
      liveAccuracyStyle: "off",
      liveBurstStyle: "off",
      liveStatsOpacity: 0.7,
      alwaysShowDecimal: false,
      typingSpeedUnit: "wpm",
      startGraphsAtZero: true,
      keymap: "off",
      keymapStyle: "staggered",
      keymapLegend: "blank",
      keymapTopRow: "never",
      keymapSize: 0.95,
    },
    keyboard: {
      design: "ghost",
      shape: "rounded",
      compact: true,
      highlightHomeRow: false,
      showShiftLabels: false,
    },
    themeOverrides: { "--ft-font-scale": "0.95", "--ft-word-spacing": "0.35em" },
  },

  // Gentle. Line caret, next-word emphasis to stay forward-looking,
  // soft hairlines, outline rounded keys.
  "light-green": {
    caret: { style: "line", width: 2, radius: 1, blinkSpeed: 0, smoothSpeed: 260 },
    appearance: {
      highlightMode: "next-word",
      typedEffect: "fade",
      tapeMode: "off",
      tapeMargin: 50,
      smoothLineScroll: true,
      linesRendered: 3,
      maxLineWidth: 80,
      borders: "soft",
      liveProgressStyle: "text",
      liveSpeedStyle: "text",
      liveAccuracyStyle: "text",
      liveBurstStyle: "off",
      liveStatsOpacity: 0.95,
      alwaysShowDecimal: false,
      typingSpeedUnit: "wpm",
      startGraphsAtZero: true,
      keymap: "next",
      keymapStyle: "staggered",
      keymapLegend: "lowercase",
      keymapTopRow: "layout",
      keymapSize: 1.0,
    },
    keyboard: {
      design: "outline",
      shape: "rounded",
      compact: false,
      highlightHomeRow: true,
      showShiftLabels: true,
    },
    themeOverrides: { "--ft-font-scale": "1.0", "--ft-word-spacing": "0.25em" },
  },

  // Warm playful. Block caret with a corner radius, letter highlight,
  // no fade, default borders, lifted rounded keys.
  tangerine: {
    caret: { style: "block", width: 2, radius: 3, blinkSpeed: 0, smoothSpeed: 200 },
    appearance: {
      highlightMode: "letter",
      typedEffect: "off",
      tapeMode: "off",
      tapeMargin: 50,
      smoothLineScroll: true,
      linesRendered: 3,
      maxLineWidth: 70,
      borders: "default",
      liveProgressStyle: "text",
      liveSpeedStyle: "text",
      liveAccuracyStyle: "text",
      liveBurstStyle: "text",
      liveStatsOpacity: 1,
      alwaysShowDecimal: false,
      typingSpeedUnit: "wpm",
      startGraphsAtZero: true,
      keymap: "next",
      keymapStyle: "staggered",
      keymapLegend: "lowercase",
      keymapTopRow: "always",
      keymapSize: 1.05,
    },
    keyboard: {
      design: "lifted",
      shape: "rounded",
      compact: false,
      highlightHomeRow: true,
      showShiftLabels: true,
    },
    themeOverrides: { "--ft-font-scale": "1.05", "--ft-word-spacing": "0.3em" },
  },

  // Clean and familiar. Line caret, letter highlight, no fx, soft
  // borders. Stays close to defaults so the user feels at home.
  twitter: {
    caret: { style: "line", width: 2, radius: 0, blinkSpeed: 0, smoothSpeed: 250 },
    appearance: {
      highlightMode: "letter",
      typedEffect: "off",
      tapeMode: "off",
      tapeMargin: 50,
      smoothLineScroll: true,
      linesRendered: 4,
      maxLineWidth: 80,
      borders: "soft",
      liveProgressStyle: "text",
      liveSpeedStyle: "text",
      liveAccuracyStyle: "text",
      liveBurstStyle: "off",
      liveStatsOpacity: 1,
      alwaysShowDecimal: false,
      typingSpeedUnit: "wpm",
      startGraphsAtZero: true,
      keymap: "next",
      keymapStyle: "staggered",
      keymapLegend: "lowercase",
      keymapTopRow: "layout",
      keymapSize: 1.0,
    },
    keyboard: {
      design: "solid",
      shape: "rounded",
      compact: false,
      highlightHomeRow: false,
      showShiftLabels: true,
    },
    themeOverrides: { "--ft-font-scale": "1.0", "--ft-word-spacing": "0.25em" },
  },
};
