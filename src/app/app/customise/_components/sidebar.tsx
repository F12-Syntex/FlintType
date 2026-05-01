"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SECTIONS } from "./data";

/** Section navigation for the Settings layout.
 *
 *  Surfaces (light → dark for hierarchy):
 *  - Page content panel    bg-background (paper)
 *  - This sidebar          bg-muted (visibly tinted off-paper)
 *  - Active sidebar entry  bg-card (white) — lifts above the muted column
 *  - Inactive on hover     bg-card/60 — partial lift, softer than active
 *
 *  Behaviour
 *  - Desktop (lg+): full-height column, lg:overflow-hidden — the
 *    sidebar itself never scrolls. The content panel next door is the
 *    only scrolling region.
 *  - Mobile: horizontal strip; entries scroll horizontally if they
 *    overflow the viewport. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        "bg-muted border-b border-ft-line-soft py-3",
        "lg:flex lg:h-full lg:flex-col lg:overflow-hidden lg:border-r lg:border-b-0 lg:py-6",
      )}
    >
      <div className="hidden px-4 pb-4 lg:block">
        <span className="text-[10px] font-medium tracking-[0.2em] text-ft-dim uppercase">
          SECTIONS
        </span>
      </div>

      <ul className="flex gap-0 overflow-x-auto px-2 lg:flex-col lg:gap-1 lg:overflow-x-visible">
        {SECTIONS.map((s) => {
          const href = `/app/customise/${s.id}`;
          const isActive = pathname === href;
          return (
            <li key={s.id} className="shrink-0 lg:shrink">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 transition-colors",
                  isActive
                    ? "bg-card text-ft-ink shadow-sm ring-1 ring-foreground/10"
                    : "text-ft-dim-2 hover:bg-card/60 hover:text-ft-ink",
                )}
              >
                <span className="text-[11px] font-semibold tracking-[0.14em]">
                  {s.name}
                </span>
                <span
                  className={cn(
                    "rounded-md px-1.5 text-[10px] tabular-nums",
                    isActive
                      ? "bg-ft-ember/10 text-ft-ember"
                      : "text-ft-dim",
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
