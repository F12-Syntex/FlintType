"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  clearThemeVars,
  findTheme,
  STORAGE_KEY,
  THEMES,
  type Theme,
} from "./registry";

function currentMode(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function useTheme() {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setActiveId(window.localStorage.getItem(STORAGE_KEY));
  }, []);

  // Re-apply the active palette whenever the html `dark` class flips —
  // light/dark vars come from different blocks of the registry, so a
  // mode change without a re-apply leaves the chrome on the wrong set.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      const theme = findTheme(
        window.localStorage.getItem(STORAGE_KEY),
      );
      if (theme) applyTheme(root, theme, currentMode());
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const apply = useCallback((id: string) => {
    if (typeof document === "undefined") return;
    const theme = findTheme(id);
    if (!theme) return;
    applyTheme(document.documentElement, theme, currentMode());
    window.localStorage.setItem(STORAGE_KEY, id);
    setActiveId(id);
  }, []);

  const reset = useCallback(() => {
    if (typeof document === "undefined") return;
    clearThemeVars(document.documentElement);
    window.localStorage.removeItem(STORAGE_KEY);
    setActiveId(null);
  }, []);

  return { themes: THEMES, activeId, apply, reset } as const;
}

export type { Theme };
