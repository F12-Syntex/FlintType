"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApplyThemeOverrides } from "@/lib/apply-theme-overrides";
import { PaletteProvider } from "@/lib/themes/use-palette";
import { WhatsNewDialog } from "./_components/whats-new-dialog";
import { AppearanceApplier } from "./appearance-applier";
import { BackgroundApplier } from "./background-applier";
import { BordersApplier } from "./borders-applier";
import { FocusShortcut } from "./focus-shortcut";
import { PresenceHeartbeat } from "./_components/presence-heartbeat";

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
        {/* Global presence heartbeat — marks the signed-in user online
            for their friends. Self-mounting, renders nothing. */}
        <PresenceHeartbeat />
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
          {/* "What's new" popup — self-mounts, compares the cached
              app version against the running one and surfaces the
              changelog entries in between on the first load after an
              update. No-op when already up to date. */}
          <WhatsNewDialog />
        </TooltipProvider>
      </PaletteProvider>
    </ThemeProvider>
  );
}
