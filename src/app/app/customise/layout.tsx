"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppChrome } from "../_components/app-chrome";
import { SECTIONS } from "./_components/data";

/** Shared chrome for every /app/customise/<section> page.
 *
 *  Built from primitives only — no extracted "Sidebar" or "Header"
 *  component. Layout is:
 *    AppChrome.compact          // overflow-hidden main, layout owns scroll
 *    └ flex column, h-full
 *      ├ <header>               // title + actions, never scrolls
 *      └ grid [<nav> | content] // flex-1 + min-h-0, fills remaining space
 *        ├ <nav>                // sticky, never scrolls
 *        └ scroll panel         // overflow-y-auto, only scrolling region
 *          └ {children}         // active section settings */
export default function CustomiseLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AppChrome compact>
      <div className="flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-6 py-5 sm:px-10">
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">Export</Button>
            <Button variant="outline" size="sm">Import</Button>
            <Button variant="outline" size="sm">Reset</Button>
            <Button size="sm">Save</Button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_1fr]">
          <nav
            aria-label="Settings sections"
            className={cn(
              "border-b border-border bg-muted",
              "lg:flex lg:h-full lg:flex-col lg:overflow-hidden lg:border-r lg:border-b-0",
            )}
          >
            <ul className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-x-visible lg:p-3">
              {SECTIONS.map((s) => {
                const href = `/app/customise/${s.id}`;
                const isActive = pathname === href;
                return (
                  <li key={s.id} className="shrink-0 lg:shrink">
                    <Link
                      href={href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10"
                          : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                      )}
                    >
                      <span className="font-medium tracking-wide">
                        {s.name.charAt(0)}
                        {s.name.slice(1).toLowerCase()}
                      </span>
                      <span className="text-xs tabular-nums opacity-70">
                        {s.settings.length}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="min-h-0 overflow-y-auto bg-background px-6 py-8 sm:px-10">
            {children}
          </div>
        </div>
      </div>
    </AppChrome>
  );
}
