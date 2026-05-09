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

  // Letter-by-letter cursor underline and a gentle fade on past
  // words. Reads "you've moved on from these" without striking
  // through, which can feel punitive.
  highlightMode: "letter",
  typedEffect: "fade",

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
  startGraphsAtZero: true,

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
