"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileSectionPicker } from "./sidebar";

/** Sticky header for the customise pages.
 *
 *  Mobile (<lg):
 *    - non-explorer pages: the section picker text trigger sits on
 *      the left ("Appearance ⌄"); right side is empty so the strip
 *      stays light
 *    - explorer page:      a single "Back to appearance" link
 *  Desktop (lg+): hidden on non-explorer pages — the sidebar carries
 *  the navigation and import/export panel; the explorer keeps the
 *  back link because there's no sidebar on that surface. */
export function CustomiseHeader() {
  const pathname = usePathname();
  const isExplorer = pathname === "/customise/appearance/themes";

  // No header content needed at lg+ on regular settings pages — the
  // sidebar covers everything. Skip rendering entirely so we don't
  // leave an empty backdrop strip eating vertical space.
  if (!isExplorer) {
    return (
      <header
        data-ft-chrome
        className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-2 backdrop-blur-md sm:px-8 sm:py-3 lg:hidden"
      >
        <MobileSectionPicker />
      </header>
    );
  }

  return (
    <header
      data-ft-chrome
      className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-2 backdrop-blur-md sm:px-8 sm:py-4 lg:px-10"
    >
      <Link
        href="/customise/appearance"
        className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        Back to appearance
      </Link>
    </header>
  );
}
