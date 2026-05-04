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
  showAllLines: boolean;
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

  /** Global border visibility — `soft` thins every hairline to a
   *  10%-foreground tint, `hidden` makes them transparent everywhere
   *  (themes pages, settings rows, popovers, buttons). Read by the
   *  global rule in globals.css that targets `html[data-ft-borders]`. */
  borders: BordersMode;
};

export const DEFAULT_APPEARANCE: AppearancePrefs = {
  liveProgressStyle: "text",
  liveSpeedStyle: "text",
  liveAccuracyStyle: "text",
  liveBurstStyle: "off",
  liveStatsColor: "",
  liveStatsOpacity: 1,

  highlightMode: "letter",
  typedEffect: "off",

  tapeMode: "off",
  tapeMargin: 50,
  smoothLineScroll: false,
  showAllLines: false,
  maxLineWidth: 0,

  alwaysShowDecimal: false,
  typingSpeedUnit: "wpm",
  startGraphsAtZero: true,

  keymap: "react",
  keymapLayout: "qwerty",
  keymapStyle: "staggered",
  keymapLegend: "lowercase",
  keymapTopRow: "layout",
  keymapSize: 1.0,

  borders: "default",
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
