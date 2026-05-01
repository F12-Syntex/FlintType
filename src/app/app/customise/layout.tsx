import type { ReactNode } from "react";
import { FtButton, Tag } from "@/components/ft";
import { AppChrome } from "../_components/app-chrome";
import { SECTIONS } from "./_components/data";
import { Sidebar } from "./_components/sidebar";

const TOTAL_SETTINGS = SECTIONS.reduce((n, s) => n + s.settings.length, 0);

/** Shared chrome for every /app/customise/<section> page.
 *
 *  Layout (top → bottom):
 *    AppChrome.compact               // overflow-hidden main, owns no scroll
 *    └ flex column, h-full
 *      ├ page header                  // title + global action buttons (no scroll)
 *      └ grid [sidebar | content]     // flex-1, min-h-0 — fills remaining space
 *        ├ <Sidebar/>                 // h-full, never scrolls
 *        └ scrollable panel           // overflow-y-auto, the only scrolling region
 *          └ {children}               // active section's settings list
 *
 *  AppChrome's compact prop hides the footer on mobile; on desktop the
 *  footer still sits below this whole stack outside the scroll region. */
export default function CustomiseLayout({ children }: { children: ReactNode }) {
  return (
    <AppChrome compact>
      <div className="flex h-full min-h-0 flex-col">
        <header className="shrink-0 border-b border-ft-line-soft px-5 pt-7 pb-6 sm:px-14">
          <div className="mb-3.5 flex items-center gap-3.5">
            <span className="inline-block h-px w-7 bg-ft-ember" aria-hidden />
            <Tag>SETTINGS · {TOTAL_SETTINGS} OPTIONS · CONFIG.JSON</Tag>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-[44px]">
              Make it <span className="text-ft-ember">yours</span>.
            </h1>
            <div className="flex flex-wrap gap-2">
              <FtButton variant="ghost" size="sm">EXPORT</FtButton>
              <FtButton variant="ghost" size="sm">IMPORT</FtButton>
              <FtButton variant="ghost" size="sm">RESET</FtButton>
              <FtButton variant="ember" size="sm">SAVE</FtButton>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_1fr]">
          <Sidebar />
          {/* The only scrollable region in the whole settings page. */}
          <div className="min-h-0 overflow-y-auto px-5 py-8 sm:px-10 lg:px-14">
            {children}
          </div>
        </div>
      </div>
    </AppChrome>
  );
}
