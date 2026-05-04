import type { ReactNode } from "react";
import { AppChrome } from "../_components/app-chrome";
import { ImportExportControls } from "./_components/import-export";
import { SettingsSidebar } from "./_components/sidebar";

export default function CustomiseLayout({ children }: { children: ReactNode }) {
  return (
    <AppChrome compact>
      <div className="grid h-full min-h-0 grid-cols-1 text-foreground lg:grid-cols-[220px_1fr]">
        <SettingsSidebar />

        <div data-bg-scope="content" className="min-h-0 overflow-y-auto">
          <header className="border-b border-border px-4 py-3 sm:px-8 sm:py-4 lg:px-10">
            <ImportExportControls />
          </header>

          <div className="px-4 py-6 sm:px-8 sm:py-8 lg:px-10">{children}</div>
        </div>
      </div>
    </AppChrome>
  );
}
