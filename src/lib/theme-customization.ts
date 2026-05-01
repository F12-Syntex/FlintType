"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ft-theme-vars";

export const THEME_VARS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--primary",
  "--primary-foreground",
  "--accent",
  "--accent-foreground",
  "--muted",
  "--muted-foreground",
  "--border",
  "--input",
  "--ring",
  "--radius",
] as const;

export type ThemeVar = (typeof THEME_VARS)[number];
export type ThemeOverrides = Partial<Record<ThemeVar, string>>;

function readStored(): ThemeOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ThemeOverrides) : {};
  } catch {
    return {};
  }
}

function writeStored(overrides: ThemeOverrides) {
  if (typeof window === "undefined") return;
  if (Object.keys(overrides).length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
  } else {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }
}

function applyVar(name: ThemeVar, value: string | undefined) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (value == null || value === "") {
    root.style.removeProperty(name);
  } else {
    root.style.setProperty(name, value);
  }
}

export function useThemeOverrides() {
  const [overrides, setOverrides] = useState<ThemeOverrides>({});

  useEffect(() => {
    const stored = readStored();
    setOverrides(stored);
    for (const [k, v] of Object.entries(stored)) {
      applyVar(k as ThemeVar, v);
    }
  }, []);

  const setVar = useCallback((name: ThemeVar, value: string) => {
    setOverrides((prev) => {
      const next: ThemeOverrides = { ...prev, [name]: value };
      writeStored(next);
      return next;
    });
    applyVar(name, value);
  }, []);

  const clearVar = useCallback((name: ThemeVar) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[name];
      writeStored(next);
      return next;
    });
    applyVar(name, undefined);
  }, []);

  const reset = useCallback(() => {
    for (const v of THEME_VARS) applyVar(v, undefined);
    setOverrides({});
    writeStored({});
  }, []);

  return { overrides, setVar, clearVar, reset };
}
