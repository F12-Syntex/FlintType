"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AppChrome } from "../_components/app-chrome";
import { SECTIONS } from "./_components/data";

const TOTAL_SETTINGS = SECTIONS.reduce((n, s) => n + s.settings.length, 0);

function titleCase(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function CustomiseLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AppChrome compact>
      <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
        <header className="shrink-0 border-b border-border bg-card px-6 pt-7 pb-6 shadow-sm sm:px-10">
          <div className="mb-3 flex items-center gap-3">
            <span
              aria-hidden
              className="inline-block h-px w-7 bg-primary"
            />
            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Settings · {TOTAL_SETTINGS} options
            </span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Make it <span className="text-primary">yours</span>.
            </h1>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">Export</Button>
              <Button variant="outline" size="sm">Import</Button>
              <Button variant="ghost" size="sm">Reset</Button>
              <Button size="sm">Save</Button>
            </div>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_1fr]">
          <nav
            aria-label="Settings sections"
            className={cn(
              "border-b border-border bg-muted",
              "lg:flex lg:h-full lg:flex-col lg:overflow-hidden lg:border-r lg:border-b-0",
            )}
          >
            <div className="hidden px-4 pt-5 pb-3 lg:block">
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Sections
              </span>
            </div>
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
                        "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                        isActive
                          ? "bg-card text-foreground ring-1 ring-border shadow-sm"
                          : "text-muted-foreground hover:bg-card hover:text-foreground",
                      )}
                    >
                      <span className="font-medium">{titleCase(s.name)}</span>
                      <Badge
                        variant={isActive ? "default" : "secondary"}
                        className="px-2 text-[0.65rem] tabular-nums"
                      >
                        {s.settings.length}
                      </Badge>
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
