"use client";

import { useCallback, useMemo } from "react";
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
};

export const DEFAULT_BEHAVIOUR: BehaviourPrefs = {
  quickRestart: true,
  stopOnError: false,
  confidence: "off",
  allowExtras: true,
  strictSpace: false,
  blindMode: false,
  minWordLength: 1,
  showSecondary: false,
  excludeCasualFromAdapt: false,
};

export function useBehaviourPrefs() {
  const { value: prefs, update: updateRaw, reset } = useRemotePrefs(
    "behaviour",
    DEFAULT_BEHAVIOUR,
  );

  const update = useCallback(
    <K extends keyof BehaviourPrefs>(key: K, value: BehaviourPrefs[K]) => {
      updateRaw({ [key]: value } as Partial<BehaviourPrefs>);
    },
    [updateRaw],
  );

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
