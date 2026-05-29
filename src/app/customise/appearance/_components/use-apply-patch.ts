"use client";

import { useCallback, useRef } from "react";
import {
  type AppearancePrefs,
  useAppearancePrefs,
} from "@/lib/appearance-prefs";
import {
  type BackgroundPrefs,
  useBackgroundPrefs,
} from "@/lib/background-prefs";
import { type ThemeVar, useThemeOverrides } from "@/lib/theme-customization";
import type { AppearancePatch } from "@/types/appearance-ai";

type Snapshot = {
  theme: Record<string, string | undefined>;
  appearance: Partial<Record<keyof AppearancePrefs, unknown>>;
  background: Partial<Record<keyof BackgroundPrefs, unknown>>;
};

/** Apply an AI patch straight onto the live prefs stores (so the whole
 *  page + the persistent preview repaint immediately), capturing the
 *  prior values first so a Discard can put everything back. The preview
 *  IS the real app state — Accept just keeps it, Discard reverts it. */
export function useApplyPatch() {
  const { overrides, setVar, clearVar } = useThemeOverrides();
  const { prefs: appearance, update: updateAppearance } = useAppearancePrefs();
  const { prefs: background, update: updateBackground } = useBackgroundPrefs();

  // Read latest store values through refs so apply() snapshots the real
  // current state, not a value captured when the callback was created.
  const overridesRef = useRef(overrides);
  overridesRef.current = overrides;
  const appearanceRef = useRef(appearance);
  appearanceRef.current = appearance;
  const backgroundRef = useRef(background);
  backgroundRef.current = background;

  const snapshotRef = useRef<Snapshot | null>(null);

  const apply = useCallback(
    (patch: AppearancePatch) => {
      const snap: Snapshot = { theme: {}, appearance: {}, background: {} };

      for (const k of Object.keys(patch.theme)) {
        snap.theme[k] = overridesRef.current[k as ThemeVar];
      }
      for (const k of Object.keys(patch.appearance)) {
        const key = k as keyof AppearancePrefs;
        snap.appearance[key] = appearanceRef.current[key];
      }
      for (const k of Object.keys(patch.background)) {
        const key = k as keyof BackgroundPrefs;
        snap.background[key] = backgroundRef.current[key];
      }
      snapshotRef.current = snap;

      for (const [k, v] of Object.entries(patch.theme)) {
        setVar(k as ThemeVar, v);
      }
      for (const [k, v] of Object.entries(patch.appearance)) {
        updateAppearance(k as keyof AppearancePrefs, v as never);
      }
      for (const [k, v] of Object.entries(patch.background)) {
        updateBackground(k as keyof BackgroundPrefs, v as never);
      }
    },
    [setVar, updateAppearance, updateBackground],
  );

  const revert = useCallback(() => {
    const snap = snapshotRef.current;
    if (!snap) return;
    for (const [k, v] of Object.entries(snap.theme)) {
      if (v === undefined || v === "") clearVar(k as ThemeVar);
      else setVar(k as ThemeVar, v);
    }
    for (const [k, v] of Object.entries(snap.appearance)) {
      updateAppearance(k as keyof AppearancePrefs, v as never);
    }
    for (const [k, v] of Object.entries(snap.background)) {
      updateBackground(k as keyof BackgroundPrefs, v as never);
    }
    snapshotRef.current = null;
  }, [setVar, clearVar, updateAppearance, updateBackground]);

  /** Keep the applied patch; forget the undo point (Accept). */
  const commit = useCallback(() => {
    snapshotRef.current = null;
  }, []);

  return { apply, revert, commit };
}
