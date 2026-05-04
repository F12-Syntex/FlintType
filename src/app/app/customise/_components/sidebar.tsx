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

/** Compact section dropdown. Lives inside the sticky CustomiseHeader on
 *  mobile so we get one strip of chrome instead of two. */
export function MobileSectionPicker() {
  const pathname = usePathname();
  const router = useRouter();
  const active = SECTIONS.find(
    (s) => pathname === `/app/customise/${s.id}`,
  );
  const activeName = active ? titleCase(active.name) : "Sections";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex max-w-[60vw] items-center gap-2 font-medium"
        >
          <span className="truncate text-sm leading-none text-foreground">
            {activeName}
          </span>
          <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-[60vh] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto">
        {SECTIONS.map((s) => {
          const href = `/app/customise/${s.id}`;
          const isActive = active?.id === s.id;
          return (
            <DropdownMenuItem
              key={s.id}
              onSelect={() => router.push(href)}
              className="gap-3 text-foreground"
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
  );
}

export function SettingsSidebar() {
  const pathname = usePathname();
  const active = SECTIONS.find(
    (s) => pathname === `/app/customise/${s.id}`,
  );

  // Desktop only — a flat list. Active item gets a left accent bar and
  // a faint hover-tint surface — no shadow, no ring, no card.
  // On mobile, the section picker is rendered inside CustomiseHeader.
  return (
    <nav
      data-ft-chrome
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
  );
}
