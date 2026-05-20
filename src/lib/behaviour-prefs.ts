"use client";

import { useCallback, useMemo } from "react";
import { usePrefsOverride } from "./prefs-override";
import { useRemotePrefs } from "./use-remote-prefs";

export type Confidence = "off" | "word" | "all";

export type BehaviourPrefs = {
  quickRestart: boolean;
  stopOnError: boolean;
  confidence: Confidence;
  /** When false, characters typed past the target word's length are
   *  ignored instead of being recorded as extras. Off matches the
   *  "always-clean passage" feel some typists prefer. */
  allowExtras: boolean;
  /** When true, hitting space before the current word is fully typed
   *  refuses to advance — the user must finish or backspace. Mimics
   *  MonkeyType's strict-space mode. */
  strictSpace: boolean;
  blindMode: boolean;
  minWordLength: number;
  showSecondary: boolean;
  /** When true, completed tests in casual mode do NOT feed the
   *  adaptive bigram / trigram / motor-feature / word models — the
   *  test row + PB still record, but the algorithm ignores the
   *  keystrokes. Default false (casual contributes), since the
   *  more data the model has the better its weakness picks get. */
  excludeCasualFromAdapt: boolean;
  /** Threshold WPM each item must clear in BURST mode. 0 = "auto":
   *  use the user's rolling average WPM (or a sensible 50 WPM
   *  fallback when there's no signal yet). Any positive value
   *  overrides auto with the user's explicit pick. */
  burstThreshold: number;
};

export const DEFAULT_BEHAVIOUR: BehaviourPrefs = {
  // Quick restart off by default — users have to tab+enter to start
  // a fresh run, which prevents accidental restarts mid-stream from
  // a stray Tab keypress.
  quickRestart: false,
  stopOnError: false,
  confidence: "off",
  allowExtras: true,
  strictSpace: false,
  blindMode: false,
  minWordLength: 1,
  showSecondary: false,
  excludeCasualFromAdapt: false,
  burstThreshold: 0,
};

export function useBehaviourPrefs() {
  const override = usePrefsOverride()?.behaviour;
  const { value: storePrefs, update: updateRaw, reset: resetRaw } = useRemotePrefs(
    "behaviour",
    DEFAULT_BEHAVIOUR,
  );
  const prefs = override ?? storePrefs;
  const overridden = override != null;

  const update = useCallback(
    <K extends keyof BehaviourPrefs>(key: K, value: BehaviourPrefs[K]) => {
      if (overridden) return; // read-only under a prefs override
      updateRaw({ [key]: value } as Partial<BehaviourPrefs>);
    },
    [updateRaw, overridden],
  );
  const reset = useCallback(() => {
    if (!overridden) resetRaw();
  }, [resetRaw, overridden]);

  const customizedCount = useMemo(
    () =>
      (Object.keys(DEFAULT_BEHAVIOUR) as Array<keyof BehaviourPrefs>).reduce(
        (n, k) => n + (prefs[k] !== DEFAULT_BEHAVIOUR[k] ? 1 : 0),
        0,
      ),
    [prefs],
  );

  return { prefs, update, reset, customizedCount } as const;
}
