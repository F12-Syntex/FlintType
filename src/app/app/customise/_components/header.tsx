"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ImportExportControls } from "./import-export";

/** Sticky header strip for every settings page. Carries Import/Export
 *  on the right; on the theme explorer, replaces them with a single
 *  Back link so the explorer feels like a deliberate sub-surface
 *  rather than another settings page. */
export function CustomiseHeader() {
  const pathname = usePathname();
  const isExplorer = pathname === "/app/customise/appearance/themes";

  return (
    <header
      data-ft-chrome
      className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md sm:px-8 sm:py-4 lg:px-10"
    >
      {isExplorer ? (
        <Link
          href="/app/customise/appearance"
          className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Back to appearance
        </Link>
      ) : (
        <span aria-hidden />
      )}
      <ImportExportControls />
    </header>
  );
}
