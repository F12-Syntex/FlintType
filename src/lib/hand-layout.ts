"use client";

import { useCallback } from "react";
import { useRemotePrefs } from "./use-remote-prefs";

/** Per-finger identity. The number is the anatomical index — 1 = thumb,
 *  2 = index, 3 = middle, 4 = ring, 5 = pinky — prefixed with the hand
 *  side. Stable across the codebase: hand-layout UI, adaptive drilling,
 *  per-finger heatmaps all read these ids. */
export type FingerId =
  | "L5"
  | "L4"
  | "L3"
  | "L2"
  | "L1"
  | "R1"
  | "R2"
  | "R3"
  | "R4"
  | "R5";

export type FingerState = {
  /** When false, adaptive drilling never schedules drills for this
   *  finger and the heatmap omits it. Lets users with missing or
   *  immobile fingers describe their hand truthfully. */
  enabled: boolean;
  /** Where the finger rests at neutral position. A KeyboardEvent.code
   *  ("KeyF", "Semicolon", "Space"). Defines which keys "belong" to
   *  this finger for analytics and for the on-keyboard finger badges. */
  homeKey: string;
};

export type HandLayoutPrefs = {
  fingers: Record<FingerId, FingerState>;
};

/** Standard touch-typing home row. Both thumbs share Space. */
export const DEFAULT_HAND_LAYOUT: HandLayoutPrefs = {
  fingers: {
    L5: { enabled: true, homeKey: "KeyA" },
    L4: { enabled: true, homeKey: "KeyS" },
    L3: { enabled: true, homeKey: "KeyD" },
    L2: { enabled: true, homeKey: "KeyF" },
    L1: { enabled: true, homeKey: "Space" },
    R1: { enabled: true, homeKey: "Space" },
    R2: { enabled: true, homeKey: "KeyJ" },
    R3: { enabled: true, homeKey: "KeyK" },
    R4: { enabled: true, homeKey: "KeyL" },
    R5: { enabled: true, homeKey: "Semicolon" },
  },
};

/** Anatomical name for a finger id — used in tooltips, accessible
 *  labels, and the disable confirmation copy. */
export const FINGER_NAME: Record<FingerId, string> = {
  L5: "Left pinky",
  L4: "Left ring",
  L3: "Left middle",
  L2: "Left index",
  L1: "Left thumb",
  R1: "Right thumb",
  R2: "Right index",
  R3: "Right middle",
  R4: "Right ring",
  R5: "Right pinky",
};

/** Left-to-right rendering order on each hand. Matters because the
 *  hand SVG draws fingers in this sequence, and disabling the wrong
 *  one because of an off-by-one would feel awful. */
export const LEFT_FINGERS: readonly FingerId[] = ["L5", "L4", "L3", "L2", "L1"];
export const RIGHT_FINGERS: readonly FingerId[] = ["R1", "R2", "R3", "R4", "R5"];

const ALL_FINGER_IDS: readonly FingerId[] = [
  ...LEFT_FINGERS,
  ...RIGHT_FINGERS,
];

/** Coerce an unknown shape (typically a JSON blob from the user's
 *  prefs row) into a valid `HandLayoutPrefs`. Missing top-level,
 *  missing `fingers`, missing per-finger entries — any of these
 *  fall back to the default value rather than throwing.
 *
 *  Used at every boundary that loads a hand layout from the user's
 *  prefs blob, so downstream code (key-map, motor features,
 *  bigramCategory) can assume a complete shape without per-call
 *  defensive checks. */
export function ensureHandLayout(raw: unknown): HandLayoutPrefs {
  if (!raw || typeof raw !== "object") return DEFAULT_HAND_LAYOUT;
  const fingers = (raw as { fingers?: unknown }).fingers;
  if (!fingers || typeof fingers !== "object") return DEFAULT_HAND_LAYOUT;
  const merged: Record<FingerId, FingerState> = {
    ...DEFAULT_HAND_LAYOUT.fingers,
  };
  for (const id of ALL_FINGER_IDS) {
    const f = (fingers as Record<string, unknown>)[id];
    if (!f || typeof f !== "object") continue;
    const stored = f as Partial<FingerState>;
    merged[id] = {
      enabled:
        typeof stored.enabled === "boolean"
          ? stored.enabled
          : DEFAULT_HAND_LAYOUT.fingers[id].enabled,
      homeKey:
        typeof stored.homeKey === "string"
          ? stored.homeKey
          : DEFAULT_HAND_LAYOUT.fingers[id].homeKey,
    };
  }
  return { fingers: merged };
}

export function useHandLayout() {
  const { value, update, reset } = useRemotePrefs(
    "handLayout",
    DEFAULT_HAND_LAYOUT,
  );

  const setFinger = useCallback(
    (id: FingerId, patch: Partial<FingerState>) => {
      update((prev) => ({
        ...prev,
        fingers: {
          ...prev.fingers,
          [id]: { ...prev.fingers[id], ...patch },
        },
      }));
    },
    [update],
  );

  const toggleEnabled = useCallback(
    (id: FingerId) => {
      update((prev) => ({
        ...prev,
        fingers: {
          ...prev.fingers,
          [id]: {
            ...prev.fingers[id],
            enabled: !prev.fingers[id].enabled,
          },
        },
      }));
    },
    [update],
  );

  return { layout: value, setFinger, toggleEnabled, reset } as const;
}
