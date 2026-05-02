"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { PaletteProvider } from "@/lib/themes/use-palette";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <PaletteProvider>{children}</PaletteProvider>
    </ThemeProvider>
  );
}
