import type { ReactNode } from "react";
import { AppChrome } from "../_components/app-chrome";
import { CustomiseHeader } from "./_components/header";
import { SettingsSidebar } from "./_components/sidebar";

export default function CustomiseLayout({ children }: { children: ReactNode }) {
  return (
    <AppChrome compact>
      <div className="grid h-full min-h-0 grid-cols-1 text-foreground lg:grid-cols-[220px_1fr]">
        <SettingsSidebar />

        {/* The bg-scope wrapper does NOT scroll — it owns the
            ::before/::after pseudos that paint the background image
            and must keep them pinned to the visible content area. The
            inner element is the scroller. Without this split, the
            pseudo (position:absolute, inset:0) would sit at the top
            of the scrollable height and scroll out of view. */}
        <div
          data-bg-scope="content"
          className="relative min-h-0 overflow-hidden"
        >
          <div className="absolute inset-0 overflow-y-auto">
            <CustomiseHeader />
            <div className="px-4 py-6 sm:px-8 sm:py-8 lg:px-10">
              {children}
            </div>
          </div>
        </div>
      </div>
    </AppChrome>
  );
}
