"use client";

import { useMemo } from "react";
import { useRemotePrefs } from "./use-remote-prefs";

export type KeyboardDesign =
  | "solid"
  | "outline"
  | "ghost"
  | "lifted"
  | "glass";

export type KeyboardShape = "square" | "rounded" | "pill";

export type KeyboardSettings = {
  design: KeyboardDesign;
  /** Corner radius preset for individual keys. */
  shape: KeyboardShape;
  /** Drop everything that isn't a letter key — number row, function
   *  modifiers, space row. The result is a 3-row letter-only board
   *  that fits comfortably on a tight viewport. */
  compact: boolean;
  /** Always light the F + J home-row pegs so the user can find their
   *  hands at a glance. */
  highlightHomeRow: boolean;
  /** Render the small shift-label glyph (e.g. `!` over `1`). Off makes
   *  the keyboard considerably quieter. */
  showShiftLabels: boolean;
};

export const DEFAULT_KEYBOARD: KeyboardSettings = {
  // Outline keys read as quiet chrome — solid keys compete with
  // the passage for visual weight, especially on a fresh user's
  // first session. Outline lets the colour palette breathe.
  design: "outline",
  shape: "rounded",
  compact: false,
  // F + J pegs lit by default — finds-your-hands cue is worth the
  // extra mark on the board.
  highlightHomeRow: true,
  showShiftLabels: true,
};

export const KEYBOARD_DESIGNS: ReadonlyArray<{
  id: KeyboardDesign;
  label: string;
}> = [
  { id: "solid", label: "Solid" },
  { id: "outline", label: "Outline" },
  { id: "ghost", label: "Ghost" },
  { id: "lifted", label: "Lifted" },
  { id: "glass", label: "Glass" },
];

export const KEYBOARD_SHAPES: ReadonlyArray<{
  id: KeyboardShape;
  label: string;
}> = [
  { id: "square", label: "Square" },
  { id: "rounded", label: "Rounded" },
  { id: "pill", label: "Pill" },
];

/** Always-lit codes when `highlightHomeRow` is enabled. */
export const HOME_ROW_PEGS: ReadonlySet<string> = new Set([
  "KeyF",
  "KeyJ",
]);

export function useKeyboardSettings() {
  const { value: settings, update, reset } = useRemotePrefs(
    "keyboard",
    DEFAULT_KEYBOARD,
  );

  const isCustomised = useMemo(
    () =>
      (Object.keys(DEFAULT_KEYBOARD) as (keyof KeyboardSettings)[]).some(
        (k) => settings[k] !== DEFAULT_KEYBOARD[k],
      ),
    [settings],
  );

  return {
    settings,
    update: (patch: Partial<KeyboardSettings>) => update(patch),
    reset,
    isCustomised,
  } as const;
}

/** Class fragments for each design. Exported separately so the
 *  Appearance preview chips and the live keyboard render the exact
 *  same surface — no drift. Each design returns a tuple of
 *  [resting-state-classes, pressed-state-classes]. */
export function designClasses(design: KeyboardDesign): [string, string] {
  switch (design) {
    case "solid":
      return [
        "border-muted-foreground bg-muted-foreground text-background",
        "border-primary bg-primary text-primary-foreground",
      ];
    case "outline":
      return [
        "border-foreground/30 bg-transparent text-foreground",
        "border-primary bg-primary/15 text-primary",
      ];
    case "ghost":
      return [
        "border-transparent bg-transparent text-foreground",
        "border-transparent bg-primary/15 text-primary",
      ];
    case "lifted":
      return [
        "border-foreground/25 border-b-4 border-b-foreground/35 bg-card text-foreground shadow-sm",
        "border-primary border-b-4 border-b-primary bg-primary/15 text-primary",
      ];
    case "glass":
      return [
        "border-foreground/20 bg-foreground/10 text-foreground backdrop-blur",
        "border-primary bg-primary/30 text-foreground",
      ];
  }
}

/** Single class fragment that maps a shape to the border-radius
 *  utility used on every key. Pill is much rounder than rounded
 *  because rounded already matches the Tailwind default. */
export function shapeClass(shape: KeyboardShape): string {
  switch (shape) {
    case "square":
      return "rounded-none";
    case "rounded":
      return "rounded-[6px]";
    case "pill":
      return "rounded-full";
  }
}
