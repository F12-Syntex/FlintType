"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openCommandPalette } from "@/lib/command-palette/open";
import { MobileSettingsPicker } from "./sidebar";

/** Sticky header for the settings pages below `lg` (the sidebar takes
 *  over from `lg` up): the page picker on the left, search on the
 *  right. */
export function CustomiseHeader() {
  return (
    <header
      data-ft-chrome
      className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border/60 bg-background/85 py-1.5 backdrop-blur-md lg:hidden"
    >
      <MobileSettingsPicker />
      <Button
        variant="ghost"
        size="icon-lg"
        onClick={openCommandPalette}
        aria-label="Search settings"
        className="text-muted-foreground"
      >
        <Search aria-hidden />
      </Button>
    </header>
  );
}
