"use client";

import { useMemo } from "react";
import { useRemotePrefs } from "./use-remote-prefs";

export type CaretStyle = "line" | "block" | "underline" | "outline" | "off";

export type CaretSettings = {
  style: CaretStyle;
  /** Bar thickness in px (line + underline variants only). */
  width: number;
  /** Corner roundness in px. */
  radius: number;
  /** Blink cycle in ms. 0 disables the blink animation entirely. */
  blinkSpeed: number;
  /** Position-transition duration in ms. 0 makes the caret teleport. */
  smoothSpeed: number;
};

export const DEFAULT_CARET: CaretSettings = {
  style: "line",
  width: 2,
  radius: 0,
  // No blink by default — a still caret reads as part of the text,
  // a blinking one demands attention while the user is typing.
  blinkSpeed: 0,
  // Default to a deliberately slow glide — the caret should feel
  // intentional, not jumpy. Matches the `Drift` preset (300 ms) one
  // step inside the Glide/Drift end of the smooth ramp.
  smoothSpeed: 300,
};

export function useCaretSettings() {
  const { value: settings, update, reset } = useRemotePrefs(
    "caret",
    DEFAULT_CARET,
  );

  const isCustomised = useMemo(
    () =>
      settings.style !== DEFAULT_CARET.style ||
      settings.width !== DEFAULT_CARET.width ||
      settings.radius !== DEFAULT_CARET.radius ||
      settings.blinkSpeed !== DEFAULT_CARET.blinkSpeed ||
      settings.smoothSpeed !== DEFAULT_CARET.smoothSpeed,
    [settings],
  );

  return {
    settings,
    update: (patch: Partial<CaretSettings>) => update(patch),
    reset,
    isCustomised,
  } as const;
}
