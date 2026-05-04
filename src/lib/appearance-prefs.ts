"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ft-appearance-prefs";

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

  keymap: "off",
  keymapLayout: "qwerty",
  keymapStyle: "staggered",
  keymapLegend: "lowercase",
  keymapTopRow: "layout",
  keymapSize: 1.0,
};

// ─── persistence ──────────────────────────────────────────────────────

function readStored(): AppearancePrefs {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<AppearancePrefs>;
    return { ...DEFAULT_APPEARANCE, ...parsed };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

function writeStored(prefs: AppearancePrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* quota — fine, value stays for the session */
  }
}

// ─── hook ─────────────────────────────────────────────────────────────

export function useAppearancePrefs() {
  const [prefs, setPrefs] = useState<AppearancePrefs>(DEFAULT_APPEARANCE);

  useEffect(() => {
    setPrefs(readStored());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPrefs(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback(
    <K extends keyof AppearancePrefs>(key: K, value: AppearancePrefs[K]) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        writeStored(next);
        return next;
      });
    },
    [],
  );

  const reset = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setPrefs(DEFAULT_APPEARANCE);
  }, []);

  const customizedCount = (
    Object.keys(DEFAULT_APPEARANCE) as Array<keyof AppearancePrefs>
  ).reduce(
    (n, k) => n + (prefs[k] !== DEFAULT_APPEARANCE[k] ? 1 : 0),
    0,
  );

  return { prefs, update, reset, customizedCount } as const;
}
