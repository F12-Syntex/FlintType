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
          <header className="border-b border-border px-6 py-4 sm:px-10">
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" size="sm">Export</Button>
              <Button variant="outline" size="sm">Import</Button>
              <Button variant="ghost" size="sm">Reset</Button>
              <Button size="sm">Save</Button>
            </div>
          </header>

          <div className="px-6 py-8 sm:px-10">{children}</div>
        </div>
      </div>
    </AppChrome>
  );
}
