"use client";

import { useCallback, useMemo } from "react";
import { useRemotePrefs } from "./use-remote-prefs";

export type Confidence = "off" | "word" | "all";
export type Difficulty = "easy" | "normal" | "expert" | "master";

export type BehaviourPrefs = {
  quickRestart: boolean;
  liveWpm: boolean;
  liveAccuracy: boolean;
  liveKeyboard: boolean;
  stopOnError: boolean;
  confidence: Confidence;
  minWordLength: number;
  difficulty: Difficulty;
  showSecondary: boolean;
  blindMode: boolean;
};

export const DEFAULT_BEHAVIOUR: BehaviourPrefs = {
  quickRestart: true,
  liveWpm: true,
  liveAccuracy: true,
  liveKeyboard: true,
  stopOnError: false,
  confidence: "off",
  minWordLength: 1,
  difficulty: "normal",
  showSecondary: false,
  blindMode: false,
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
