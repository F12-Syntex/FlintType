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
import {
  type BehaviourPrefs,
  useBehaviourPrefs,
} from "@/lib/behaviour-prefs";
import { readSlice, writeSlice } from "@/lib/prefs-store";
import { type ThemeVar, useThemeOverrides } from "@/lib/theme-customization";
import type { PaletteSlice } from "@/lib/themes/palette-fork";
import type { AppearancePatch } from "@/types/appearance-ai";

type Snapshot = {
  theme: Record<string, string | undefined>;
  /** The palette slice as it was before the first apply — setVar forks
   *  it to "custom", so an undone suggestion must put the user's named
   *  palette back, not leave them stranded on Custom. */
  palette: PaletteSlice;
  appearance: Partial<Record<keyof AppearancePrefs, unknown>>;
  background: Partial<Record<keyof BackgroundPrefs, unknown>>;
  behaviour: Partial<Record<keyof BehaviourPrefs, unknown>>;
};

/** Apply an AI patch straight onto the live prefs stores — theme,
 *  appearance, background, AND behaviour — so the customise page and its
 *  live previews repaint immediately. Captures the prior values first so
 *  `revert` can put everything back; `commit` keeps it and forgets the
 *  undo point. Every write goes through the same typed store setters the
 *  manual controls use. */
export function useApplyPatch() {
  const { overrides, setVar, clearVar } = useThemeOverrides();
  const { prefs: appearance, update: updateAppearance } = useAppearancePrefs();
  const { prefs: background, update: updateBackground } = useBackgroundPrefs();
  const { prefs: behaviour, update: updateBehaviour } = useBehaviourPrefs();

  const overridesRef = useRef(overrides);
  overridesRef.current = overrides;
  const appearanceRef = useRef(appearance);
  appearanceRef.current = appearance;
  const backgroundRef = useRef(background);
  backgroundRef.current = background;
  const behaviourRef = useRef(behaviour);
  behaviourRef.current = behaviour;

  const snapshotRef = useRef<Snapshot | null>(null);

  const apply = useCallback(
    (patch: AppearancePatch) => {
      const snap: Snapshot = {
        theme: {},
        palette: readSlice<PaletteSlice>("palette", { activeId: null }),
        appearance: {},
        background: {},
        behaviour: {},
      };

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
      for (const k of Object.keys(patch.behaviour)) {
        const key = k as keyof BehaviourPrefs;
        snap.behaviour[key] = behaviourRef.current[key];
      }
      // Merge onto any prior snapshot so a multi-step session can still
      // revert all the way back to the original.
      if (snapshotRef.current) {
        snapshotRef.current = {
          theme: { ...snap.theme, ...snapshotRef.current.theme },
          // The FIRST apply's palette is the one to restore.
          palette: snapshotRef.current.palette,
          appearance: { ...snap.appearance, ...snapshotRef.current.appearance },
          background: { ...snap.background, ...snapshotRef.current.background },
          behaviour: { ...snap.behaviour, ...snapshotRef.current.behaviour },
        };
      } else {
        snapshotRef.current = snap;
      }

      for (const [k, v] of Object.entries(patch.theme)) {
        setVar(k as ThemeVar, v);
      }
      for (const [k, v] of Object.entries(patch.appearance)) {
        updateAppearance(k as keyof AppearancePrefs, v as never);
      }
      for (const [k, v] of Object.entries(patch.background)) {
        updateBackground(k as keyof BackgroundPrefs, v as never);
      }
      for (const [k, v] of Object.entries(patch.behaviour)) {
        updateBehaviour(k as keyof BehaviourPrefs, v as never);
      }
    },
    [setVar, updateAppearance, updateBackground, updateBehaviour],
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
    for (const [k, v] of Object.entries(snap.behaviour)) {
      updateBehaviour(k as keyof BehaviourPrefs, v as never);
    }
    // Last — the setVar calls above re-fork the palette to "custom";
    // restoring the snapshot afterwards puts the named palette (and any
    // fork base) back exactly as it was before the first apply.
    writeSlice("palette", snap.palette);
    snapshotRef.current = null;
  }, [setVar, clearVar, updateAppearance, updateBackground, updateBehaviour]);

  /** Keep the applied changes; forget the undo point. */
  const commit = useCallback(() => {
    snapshotRef.current = null;
  }, []);

  return { apply, revert, commit };
}
