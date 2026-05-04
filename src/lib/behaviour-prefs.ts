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

/** Same-tab broadcast channel — see appearance-prefs for the rationale. */
const SAME_TAB_EVENT = "ft-behaviour-prefs-changed";

function writeStored(prefs: BehaviourPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Quota — fine, stays for the session.
  }
  window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT));
}

export function useBehaviourPrefs() {
  const [prefs, setPrefs] = useState<BehaviourPrefs>(DEFAULT_BEHAVIOUR);

  useEffect(() => {
    setPrefs(readStored());
    const reread = () => setPrefs(readStored());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) reread();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(SAME_TAB_EVENT, reread);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(SAME_TAB_EVENT, reread);
    };
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
