"use client";

import { useMemo } from "react";
import { usePrefsOverride } from "./prefs-override";
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
  // Heftier 3px bar over a 6px-rounded radius — the bar reads more
  // like a thumb-flag against the passage type, easier to track when
  // scanning. See docs/defaults-previous-2026-05-19.json for the
  // prior thinner shipping defaults.
  width: 3,
  radius: 6,
  // No blink by default — a still caret reads as part of the text,
  // a blinking one demands attention while the user is typing.
  blinkSpeed: 0,
  // 450ms — a softer, more visible glide than the prior 220ms; the
  // longer transition makes the caret read as a deliberate ribbon
  // following the typist rather than a snapping marker.
  smoothSpeed: 450,
};

const NOOP = () => {};

export function useCaretSettings() {
  const override = usePrefsOverride()?.caret;
  const { value: storeSettings, update, reset } = useRemotePrefs(
    "caret",
    DEFAULT_CARET,
  );
  const settings = override ?? storeSettings;

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
    // Read-only when overridden (the spectate clone) — never write the
    // broadcaster's caret onto the viewer's stored prefs.
    update: override ? NOOP : (patch: Partial<CaretSettings>) => update(patch),
    reset: override ? NOOP : reset,
    isCustomised,
  } as const;
}
