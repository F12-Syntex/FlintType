import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AppChrome } from "../_components/app-chrome";
import { SettingsSidebar } from "./_components/sidebar";

export default function CustomiseLayout({ children }: { children: ReactNode }) {
  return (
    <AppChrome compact>
      <div className="grid h-full min-h-0 grid-cols-1 text-foreground lg:grid-cols-[220px_1fr]">
        <SettingsSidebar />

        <div className="min-h-0 overflow-y-auto">
          <header className="border-b border-border px-4 py-3 sm:px-8 sm:py-4 lg:px-10">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {/* Export / Import are advanced and noisy on a phone — keep
                  Save and Reset as the only mobile-visible actions. */}
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                Export
              </Button>
              <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                Import
              </Button>
              <Button variant="ghost" size="sm">Reset</Button>
              <Button size="sm">Save</Button>
            </div>
          </header>

          <div className="px-4 py-6 sm:px-8 sm:py-8 lg:px-10">{children}</div>
        </div>
      </div>
    </AppChrome>
  );
}
