"use client";

import { useCallback, useEffect, useState } from "react";
import { type Mode, MODE_STORAGE_KEY } from "./mode-bootstrap";

export type { Mode };

function readSystem(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyMode(resolved: "light" | "dark") {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

/** Light/dark/system mode hook. Mirrors next-themes' minimal API
 *  (`mode`, `setMode`, `resolvedMode`) without pulling in the package.
 *  Persists the choice in localStorage and toggles the `dark` class on
 *  `<html>` so Tailwind's `dark:` variants and our themed CSS vars
 *  swap automatically. */
export function useMode() {
  const [mode, setModeState] = useState<Mode>("system");
  const [systemMode, setSystemMode] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY) as Mode | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      setModeState(stored);
    }
    setSystemMode(readSystem());

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => {
      setSystemMode(e.matches ? "dark" : "light");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolvedMode: "light" | "dark" =
    mode === "system" ? systemMode : mode;

  // Keep the html.dark class in sync whenever the resolved mode changes.
  useEffect(() => {
    if (!mounted) return;
    applyMode(resolvedMode);
  }, [resolvedMode, mounted]);

  const setMode = useCallback((next: Mode) => {
    window.localStorage.setItem(MODE_STORAGE_KEY, next);
    setModeState(next);
  }, []);

  return { mode, setMode, resolvedMode, mounted } as const;
}
