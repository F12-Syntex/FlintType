"use client";

import { Check, ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SECTIONS } from "./data";

function titleCase(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function SettingsSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const active = SECTIONS.find(
    (s) => pathname === `/app/customise/${s.id}`,
  );
  const activeName = active ? titleCase(active.name) : "Sections";

  return (
    <>
      {/* Mobile: a single dropdown trigger row. Far easier to navigate
          on a 375px viewport than a horizontal-scroll chip strip. */}
      <div className="border-b border-border bg-background/85 px-4 py-3 backdrop-blur-md lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex w-full items-center justify-between gap-2 font-medium"
            >
              <span className="flex min-w-0 items-baseline gap-2 leading-none">
                <span className="text-[10px] font-medium uppercase tracking-widest leading-none text-muted-foreground">
                  Section
                </span>
                <span className="truncate text-sm leading-none">
                  {activeName}
                </span>
              </span>
              <ChevronDown size={14} className="shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[calc(100vw-2rem)]">
            {SECTIONS.map((s) => {
              const href = `/app/customise/${s.id}`;
              const isActive = active?.id === s.id;
              return (
                <DropdownMenuItem
                  key={s.id}
                  onSelect={() => router.push(href)}
                  className="gap-3"
                >
                  <span
                    className={cn(
                      "inline-flex h-4 w-4 items-center justify-center",
                      isActive ? "text-primary" : "text-transparent",
                    )}
                  >
                    <Check size={14} />
                  </span>
                  <span className="flex-1">{titleCase(s.name)}</span>
                  <span className="tabular-nums text-xs text-muted-foreground">
                    {s.settings.length}
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop: a flat list. Active item gets a left accent bar and
          a faint hover-tint surface — no shadow, no ring, no card. */}
      <nav
        aria-label="Settings sections"
        className="hidden bg-background/85 backdrop-blur-md lg:flex lg:h-full lg:flex-col lg:overflow-y-auto lg:border-r lg:border-border"
      >
        <div className="px-4 pt-5 pb-3">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Sections
          </span>
        </div>
        <ul className="flex flex-col px-2 pb-3">
          {SECTIONS.map((s) => {
            const href = `/app/customise/${s.id}`;
            const isActive = active?.id === s.id;
            return (
              <li key={s.id}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex items-center justify-between gap-3 rounded-md py-2 pr-3 pl-4 text-sm transition-colors",
                    isActive
                      ? "bg-foreground/[0.04] text-foreground"
                      : "text-muted-foreground hover:bg-foreground/[0.03] hover:text-foreground",
                  )}
                >
                  {isActive ? (
                    <span
                      aria-hidden
                      className="absolute top-2 bottom-2 left-1 w-0.5 rounded-full bg-primary"
                    />
                  ) : null}
                  <span className="font-medium">{titleCase(s.name)}</span>
                  <span
                    className={cn(
                      "tabular-nums text-xs",
                      isActive ? "text-foreground/70" : "text-muted-foreground/70",
                    )}
                  >
                    {s.settings.length}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
