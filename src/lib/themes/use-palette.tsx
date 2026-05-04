"use client";

import { useTheme as useNextTheme } from "next-themes";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
} from "react";
import { useRemotePrefs } from "../use-remote-prefs";
import {
  applyTheme,
  clearThemeVars,
  findTheme,
  THEMES,
  type Theme,
} from "./registry";

type Ctx = {
  themes: readonly Theme[];
  activeId: string | null;
  apply: (id: string) => void;
  reset: () => void;
};

type PaletteSlice = { activeId: string | null };
const DEFAULT_PALETTE: PaletteSlice = { activeId: null };

const PaletteContext = createContext<Ctx | null>(null);

/** Hosts the active palette id (now stored in the user's prefs blob)
 *  and re-applies its CSS vars whenever next-themes flips light/dark.
 *  Sits inside <ThemeProvider> in src/app/providers.tsx so
 *  `resolvedTheme` is available. */
export function PaletteProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useNextTheme();
  const { value, update, reset } = useRemotePrefs<PaletteSlice>(
    "palette",
    DEFAULT_PALETTE,
  );
  const activeId = value.activeId;

  useEffect(() => {
    const root = document.documentElement;
    const theme = findTheme(activeId);
    if (!theme) {
      clearThemeVars(root);
      return;
    }
    const mode = resolvedTheme === "dark" ? "dark" : "light";
    applyTheme(root, theme, mode);
  }, [activeId, resolvedTheme]);

  const apply = useCallback(
    (id: string) => {
      update({ activeId: id });
    },
    [update],
  );

  const resetPalette = useCallback(() => {
    reset();
  }, [reset]);

  return (
    <PaletteContext.Provider
      value={{ themes: THEMES, activeId, apply, reset: resetPalette }}
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
