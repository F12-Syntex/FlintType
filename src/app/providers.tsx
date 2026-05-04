"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { ApplyThemeOverrides } from "@/lib/apply-theme-overrides";
import { GoogleFontsApplier } from "@/lib/fonts/loader";
import { PaletteProvider } from "@/lib/themes/use-palette";
import { BackgroundApplier } from "./background-applier";
import { BordersApplier } from "./borders-applier";

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
        <GoogleFontsApplier />
        <BackgroundApplier />
        <BordersApplier />
        {children}
      </PaletteProvider>
    </ThemeProvider>
  );
}
