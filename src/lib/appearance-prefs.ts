"use client";

import { useCallback, useMemo } from "react";
import { useRemotePrefs } from "./use-remote-prefs";

// ─── enums ────────────────────────────────────────────────────────────

export type LiveStatStyle = "off" | "text" | "mini" | "flash";
export type HighlightMode = "off" | "letter" | "word" | "next-word" | "next-letter";
export type TypedEffect = "off" | "fade" | "strike";
export type TapeMode = "off" | "word" | "letter";
export type TypingSpeedUnit = "wpm" | "cpm" | "wps" | "cps" | "wph";
export type Keymap = "off" | "static" | "react" | "next";
/** How an opponent's leading edge is marked inside the practice
 *  passage on the race screen.
 *    off  — no marking; the passage reads exactly like single-player
 *    tint — soft background band painted with a low-opacity wash of
 *           the slowest opponent's colour (legacy "highlight" mode)
 *    text — the *text* of words ahead of your cursor paints in the
 *           slowest opponent's colour, so opponent progress reads as
 *           coloured letters bleeding back toward you instead of a
 *           highlight band */
export type MultiplayerOpponentMarker = "off" | "tint" | "text";
export type KeymapStyle = "staggered" | "matrix" | "split" | "alice";
export type KeymapLegend = "lowercase" | "uppercase" | "blank" | "dynamic";
export type KeymapTopRow = "always" | "layout" | "never";
export type BordersMode = "default" | "soft" | "hidden";

// ─── shape ────────────────────────────────────────────────────────────

export type AppearancePrefs = {
  liveProgressStyle: LiveStatStyle;
  liveSpeedStyle: LiveStatStyle;
  liveAccuracyStyle: LiveStatStyle;
  liveBurstStyle: LiveStatStyle;
  /** Hex string or empty for "default" (theme primary). */
  liveStatsColor: string;
  /** 0–1. */
  liveStatsOpacity: number;

  highlightMode: HighlightMode;
  typedEffect: TypedEffect;
  /** When true, the practice passage marks a word as errored if the
   *  user pressed space before completing it — the word is added to
   *  errorWords and renders with the destructive underline. When
   *  false, the skip is silent: typed chars stay typed, untyped chars
   *  stay muted, no underline. The summary still counts the word as
   *  an error for accuracy purposes either way. */
  markIncompleteWord: boolean;

  tapeMode: TapeMode;
  /** 0–100, percent from the left edge of the typing area. */
  tapeMargin: number;
  smoothLineScroll: boolean;
  /** Maximum lines rendered in the passage. `0` means unbounded —
   *  show every line that fits in the available height. Otherwise
   *  the passage is clipped to `min(linesRendered, fits)` whole
   *  lines. Default `3`, mirroring the original cap. */
  linesRendered: number;
  /** Width in characters; 0 = align to content edges. */
  maxLineWidth: number;

  alwaysShowDecimal: boolean;
  typingSpeedUnit: TypingSpeedUnit;
  startGraphsAtZero: boolean;
  /** Result-screen sections — each is a small visualisation derived
   *  from the run's keystroke stream + per-second wpm samples. Off
   *  collapses the section, leaving the chart + stats strip + heatmap
   *  intact so the screen stays useful even at minimum density. */
  resultShowHeatmap: boolean;
  resultShowExtras: boolean;
  resultShowPerLetter: boolean;
  resultShowHandBalance: boolean;

  keymap: Keymap;
  keymapLayout: string;
  keymapStyle: KeymapStyle;
  keymapLegend: KeymapLegend;
  keymapTopRow: KeymapTopRow;
  /** 0.5–3.5. */
  keymapSize: number;
  /** When true, the keymap drops modifier keys (Tab, Caps, Shift, Ctrl,
   *  Alt, Meta, Enter, Backspace, Space) and renders only the letter /
   *  symbol grid. Useful when the keymap sits under the passage and a
   *  full-width row would push the typing area off-screen. Independent
   *  from the keyboard widget's own `compact` setting (under Keyboard),
   *  because the keymap and the practice keyboard are two separate
   *  rendered surfaces with different sizing budgets. */
  keymapCompact: boolean;

  /** Global border visibility — `soft` thins every hairline to a
   *  10%-foreground tint, `hidden` makes them transparent everywhere
   *  (themes pages, settings rows, popovers, buttons). Read by the
   *  global rule in globals.css that targets `html[data-ft-borders]`. */
  borders: BordersMode;

  /** Consecutive successful bursts required to advance to the next
   *  item in a burst drill. Pangrams ignore this (they're whole
   *  sentences and 1 rep is enough); every other burst (burst-1000,
   *  top-100 sprint, trigram burst) honours it. Range 1–10. */
  burstReps: number;

  /** Multiplayer — race surface only. When true, each racer's lane
   *  + position marker paints in their own colour pulled from the
   *  --chart-* palette so opponents are visually distinct. Default
   *  off to keep the single-accent baseline (§2). */
  multiplayerPlayerColors: boolean;
  /** How an opponent's progress is marked *inside* the practice
   *  passage. `text` (default) paints the letters of upcoming words
   *  in the slowest opponent's colour so opponents read as a
   *  coloured tide bleeding back toward you; `tint` falls back to
   *  the original soft background band; `off` hides the marker
   *  entirely. Honoured only when player colours are on. */
  multiplayerOpponentMarker: MultiplayerOpponentMarker;
  /** Bring back the chronological race feed (joins / leader
   *  changes / milestones / finishes) in the side panel. */
  multiplayerRaceFeed: boolean;
  /** Show each opponent's live WPM number in their lane row.
   *  Off keeps the lanes minimal and shifts the focus to the bars. */
  multiplayerShowOpponentWpm: boolean;
};

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  // Three live-stat columns visible by default — progress, speed,
  // accuracy. Burst stays off; it's a power-user metric and crowds
  // a fresh user's HUD.
  liveProgressStyle: "text",
  liveSpeedStyle: "text",
  liveAccuracyStyle: "text",
  liveBurstStyle: "off",
  liveStatsColor: "",
  liveStatsOpacity: 1,

  // Letter-by-letter cursor underline. Typed effect stays off by
  // default — leaving past words untouched reads as the cleanest
  // baseline; fade / strike are opt-in flavour.
  highlightMode: "letter",
  typedEffect: "off",
  // Default ON — the underline on a skipped word is the standard
  // typing-test cue that you bailed without completing it. Power
  // users who prefer a quieter passage can flip it off.
  markIncompleteWord: true,

  // Tape mode opt-in. Multi-line is the friendlier default.
  tapeMode: "off",
  tapeMargin: 50,
  // Line-scroll animation on by default — the snap-to-next-line
  // feels jarring for first-time users.
  smoothLineScroll: true,
  linesRendered: 3,
  // 80 chars is the prose-readable column. Past that the eye has
  // to track too far per line.
  maxLineWidth: 80,

  alwaysShowDecimal: false,
  typingSpeedUnit: "wpm",
  // Result-screen sections default off — the chart + stat strip
  // already carry the headline read; users opt every extra
  // visualisation back in via customise > Result.
  startGraphsAtZero: false,
  resultShowHeatmap: false,
  resultShowExtras: false,
  resultShowPerLetter: false,
  resultShowHandBalance: false,

  keymap: "react",
  keymapLayout: "qwerty",
  keymapStyle: "staggered",
  keymapLegend: "lowercase",
  keymapTopRow: "layout",
  keymapSize: 1.0,
  keymapCompact: false,

  // Hairline borders rather than full-weight ones — quieter chrome,
  // less competition for the passage.
  borders: "soft",

  // Five-in-a-row is the default the burst surface ships with — keep
  // the streak grid feeling earned without making sessions
  // marathon-length.
  burstReps: 5,

  // Off by default — the editorial single-accent baseline (coral
  // primary only) reads cleaner. Users who want each racer in their
  // own colour flip this on from customise → multiplayer.
  multiplayerPlayerColors: false,
  // `text` is the right default *when* player colours are on —
  // letters bleeding back toward you reads more clearly than a soft
  // background band, and the band fought the typed/untyped
  // colour split in the passage. The whole marker is gated on
  // multiplayerPlayerColors so the editorial baseline stays quiet
  // until the user opts in to colours at all.
  multiplayerOpponentMarker: "text",
  multiplayerRaceFeed: true,
  multiplayerShowOpponentWpm: true,
};

export function useAppearancePrefs() {
  const { value: prefs, update: updateRaw, reset } = useRemotePrefs(
    "appearance",
    DEFAULT_APPEARANCE,
  );

  const update = useCallback(
    <K extends keyof AppearancePrefs>(key: K, value: AppearancePrefs[K]) => {
      updateRaw({ [key]: value } as Partial<AppearancePrefs>);
    },
    [updateRaw],
  );

  const customizedCount = useMemo(
    () =>
      (Object.keys(DEFAULT_APPEARANCE) as Array<keyof AppearancePrefs>).reduce(
        (n, k) => n + (prefs[k] !== DEFAULT_APPEARANCE[k] ? 1 : 0),
        0,
      ),
    [prefs],
  );

  return { prefs, update, reset, customizedCount } as const;
}
