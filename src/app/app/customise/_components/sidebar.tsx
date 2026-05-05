"use client";

import { Check, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { cn } from "@/lib/utils";
import { SECTIONS } from "./data";

function titleCase(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Section picker for mobile — icon-only trigger that opens a
 *  fixed-height bottom sheet listing every section. Lives inside the
 *  sticky CustomiseHeader so the layout has one strip of chrome
 *  instead of two. */
export function MobileSectionPicker() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = SECTIONS.find(
    (s) => pathname === `/app/customise/${s.id}`,
  );
  const activeName = active ? titleCase(active.name) : "Sections";

  function go(id: string) {
    setOpen(false);
    router.push(`/app/customise/${id}`);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={`Sections — currently ${activeName}`}
        className="h-11 w-11 p-0 sm:h-9 sm:w-9"
      >
        <Menu size={18} />
      </Button>
      <MobileSheet open={open} onOpenChange={setOpen} title="Sections">
        <ul className="flex flex-col">
          {SECTIONS.map((s) => {
            const isActive = active?.id === s.id;
            return (
              <li
                key={s.id}
                className="border-b border-border last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => go(s.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-4 text-left transition-colors",
                    isActive
                      ? "bg-foreground/[0.04]"
                      : "hover:bg-foreground/5 active:bg-foreground/10",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span
                    className={cn(
                      "inline-flex h-5 w-5 shrink-0 items-center justify-center",
                      isActive ? "text-primary" : "text-transparent",
                    )}
                  >
                    <Check size={18} />
                  </span>
                  <span
                    className={cn(
                      "flex-1 text-base font-semibold",
                      isActive ? "text-foreground" : "text-foreground/90",
                    )}
                  >
                    {titleCase(s.name)}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {s.settings.length}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </MobileSheet>
    </>
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
