"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { ApplyThemeOverrides } from "@/lib/apply-theme-overrides";
import { PaletteProvider } from "@/lib/themes/use-palette";
import { BackgroundApplier } from "./background-applier";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <PaletteProvider>
        <ApplyThemeOverrides />
        <BackgroundApplier />
        {children}
      </PaletteProvider>
    </ThemeProvider>
  );
}
