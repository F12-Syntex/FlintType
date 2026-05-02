"use client";

import { useTheme as useNextTheme } from "next-themes";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  applyTheme,
  clearThemeVars,
  findTheme,
  STORAGE_KEY,
  THEMES,
  type Theme,
} from "./registry";

type Ctx = {
  themes: readonly Theme[];
  activeId: string | null;
  apply: (id: string) => void;
  reset: () => void;
};

const PaletteContext = createContext<Ctx | null>(null);

/** Hosts the active palette id and re-applies its CSS vars whenever
 *  next-themes flips light/dark. Sits inside <ThemeProvider> in
 *  src/app/providers.tsx so `resolvedTheme` is available. */
export function PaletteProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNextTheme();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate the saved id once on mount.
  useEffect(() => {
    setActiveId(window.localStorage.getItem(STORAGE_KEY));
    setHydrated(true);
  }, []);

  // (Re)apply the palette every time the active id or the resolved
  // light/dark mode changes. One source of truth — no inline scripts,
  // no MutationObservers.
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    const theme = findTheme(activeId);
    if (!theme) {
      clearThemeVars(root);
      return;
    }
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    applyTheme(root, theme, mode);
  }, [activeId, resolvedTheme, hydrated]);

  const apply = useCallback((id: string) => {
    window.localStorage.setItem(STORAGE_KEY, id);
    setActiveId(id);
  }, []);

  const reset = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setActiveId(null);
  }, []);

  return (
    <PaletteContext.Provider
      value={{ themes: THEMES, activeId, apply, reset }}
    >
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette(): Ctx {
  const ctx = useContext(PaletteContext);
  if (!ctx) {
    throw new Error("usePalette must be used inside <PaletteProvider>");
  }
  return ctx;
}

export type { Theme };
