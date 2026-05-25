import type { ReactNode } from "react";
import { AppChrome } from "../_components/app-chrome";
import { CustomiseHeader } from "./_components/header";
import { LivePreview } from "./_components/live-preview";
import { SettingsSidebar } from "./_components/sidebar";

export default function CustomiseLayout({ children }: { children: ReactNode }) {
  return (
    <AppChrome compact>
      {/* Three columns at lg+: sidebar · options · live-preview rail.
          The rail is its own scroll-independent column so the preview
          stays pinned while the options list scrolls. Below lg the
          rail collapses and the preview rides as a sticky strip at the
          top of the content scroller instead. */}
      <div className="grid h-full min-h-0 grid-cols-1 text-foreground lg:grid-cols-[var(--app-rail-width)_minmax(0,1fr)_22rem] lg:gap-3 lg:py-3">
        <SettingsSidebar />

        {/* The bg-scope wrapper does NOT scroll — it owns the
            ::before/::after pseudos that paint the background image
            and must keep them pinned to the visible content area. The
            inner element is the scroller. Without this split, the
            pseudo (position:absolute, inset:0) would sit at the top
            of the scrollable height and scroll out of view. */}
        <div
          data-bg-scope="content"
          className="relative min-h-0 overflow-hidden lg:rounded-md lg:border lg:border-border lg:bg-card"
        >
          <div className="absolute inset-0 overflow-y-auto">
            <CustomiseHeader />
            {/* Mobile / tablet: the preview rides as a sticky strip at
                the top of the scroller (the rail column is hidden). */}
            <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md sm:px-8 lg:hidden">
              <LivePreview compact />
            </div>
            <div className="px-4 py-4 sm:px-8 sm:py-8 lg:px-10">
              {children}
            </div>
          </div>
        </div>

        {/* Desktop: the live-preview rail — its own scroll, pinned. */}
        <aside className="hidden min-h-0 lg:block lg:overflow-y-auto lg:rounded-md lg:border lg:border-border lg:bg-card lg:p-4">
          <LivePreview />
        </aside>
      </div>
    </AppChrome>
  );
}
