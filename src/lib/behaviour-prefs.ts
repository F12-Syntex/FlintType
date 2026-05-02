"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ft-behaviour-prefs";

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

function readStored(): BehaviourPrefs {
  if (typeof window === "undefined") return DEFAULT_BEHAVIOUR;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BEHAVIOUR;
    const parsed = JSON.parse(raw) as Partial<BehaviourPrefs>;
    return { ...DEFAULT_BEHAVIOUR, ...parsed };
  } catch {
    return DEFAULT_BEHAVIOUR;
  }
}

function writeStored(prefs: BehaviourPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Quota — fine, stays for the session.
  }
}

export function useBehaviourPrefs() {
  const [prefs, setPrefs] = useState<BehaviourPrefs>(DEFAULT_BEHAVIOUR);

  useEffect(() => {
    setPrefs(readStored());
    // Cross-tab sync: re-read on storage events from other tabs.
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPrefs(readStored());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback(<K extends keyof BehaviourPrefs>(
    key: K,
    value: BehaviourPrefs[K],
  ) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      writeStored(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setPrefs(DEFAULT_BEHAVIOUR);
  }, []);

  const customizedCount = (Object.keys(DEFAULT_BEHAVIOUR) as Array<
    keyof BehaviourPrefs
  >).reduce(
    (n, k) => n + (prefs[k] !== DEFAULT_BEHAVIOUR[k] ? 1 : 0),
    0,
  );

  return { prefs, update, reset, customizedCount } as const;
}
