"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ft-caret-settings";

export type CaretStyle = "line" | "block" | "underline" | "outline" | "off";

export type CaretSettings = {
  style: CaretStyle;
  /** Bar thickness in px (line + underline variants only). */
  width: number;
  /** Corner roundness in px. */
  radius: number;
  /** Blink the caret on a 1s interval. */
  blink: boolean;
  /** Animate position changes between characters. */
  smooth: boolean;
};

export const DEFAULT_CARET: CaretSettings = {
  style: "line",
  width: 2,
  radius: 0,
  blink: true,
  smooth: true,
};

function readStored(): CaretSettings {
  if (typeof window === "undefined") return DEFAULT_CARET;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CARET;
    const parsed = JSON.parse(raw) as Partial<CaretSettings>;
    return { ...DEFAULT_CARET, ...parsed };
  } catch {
    return DEFAULT_CARET;
  }
}

function writeStored(settings: CaretSettings) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Quota exceeded — fine, stays for the session.
  }
}

export function useCaretSettings() {
  const [settings, setSettings] = useState<CaretSettings>(DEFAULT_CARET);

  useEffect(() => {
    setSettings(readStored());
  }, []);

  const update = useCallback((patch: Partial<CaretSettings>) => {
    setSettings((prev) => {
      const next: CaretSettings = { ...prev, ...patch };
      writeStored(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setSettings(DEFAULT_CARET);
  }, []);

  const isCustomised =
    settings.style !== DEFAULT_CARET.style ||
    settings.width !== DEFAULT_CARET.width ||
    settings.radius !== DEFAULT_CARET.radius ||
    settings.blink !== DEFAULT_CARET.blink ||
    settings.smooth !== DEFAULT_CARET.smooth;

  return { settings, update, reset, isCustomised } as const;
}
