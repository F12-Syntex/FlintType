"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApplyThemeOverrides } from "@/lib/apply-theme-overrides";
import { PaletteProvider } from "@/lib/themes/use-palette";
import { AppearanceApplier } from "./appearance-applier";
import { BackgroundApplier } from "./background-applier";
import { BordersApplier } from "./borders-applier";
import { FocusShortcut } from "./focus-shortcut";

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
        <BordersApplier />
        <AppearanceApplier />
        <FocusShortcut />
        {/* delayDuration 300ms feels responsive without firing on
            casual mouse-overs; skipDelayDuration 100ms gives the
            Monkeytype-style "fly between adjacent chips and the
            tooltip swaps instantly" behaviour. */}
        <TooltipProvider delayDuration={300} skipDelayDuration={100}>
          {children}
          {/* Global Cmd+K palette — every settings + theme + nav
              command in one searchable surface. Self-mounts; just
              listens for the shortcut. */}
          <CommandPalette />
        </TooltipProvider>
      </PaletteProvider>
    </ThemeProvider>
  );
}
