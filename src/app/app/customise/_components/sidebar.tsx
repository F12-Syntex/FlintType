"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SECTIONS } from "./data";

/** Section navigation for the Settings layout.
 *
 *  Behaviour
 *  - Desktop (lg+): sticky vertical column, full layout-row height, **no
 *    scroll**. The grid parent is min-h-0; if section count ever grows
 *    past viewport we'll need to revisit, but with 3 sections we have
 *    plenty of headroom.
 *  - Mobile: horizontal strip at the top of the page, scrolls only
 *    horizontally if entries overflow (overflow-x-auto on the wrapper).
 *
 *  Active highlight is route-driven via usePathname. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        // Mobile: just a horizontal strip with a bottom hairline.
        "border-b border-ft-line-soft py-3",
        // Desktop: full-height column, hairline on the right, padding,
        // never scrolls on either axis (overflow-hidden).
        "lg:flex lg:h-full lg:flex-col lg:overflow-hidden lg:border-r lg:border-b-0 lg:py-6",
      )}
    >
      <div className="hidden px-4 pb-4 lg:block">
        <span className="text-[10px] font-medium tracking-[0.2em] text-ft-dim uppercase">
          SECTIONS
        </span>
      </div>

      <ul className="flex gap-0 overflow-x-auto px-2 lg:flex-col lg:overflow-x-visible">
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
                    ? "bg-ft-ember/[0.08] text-ft-ink"
                    : "text-ft-dim-2 hover:bg-ft-ink/[0.04] hover:text-ft-ink",
                )}
              >
                <span className="text-[11px] font-semibold tracking-[0.14em]">
                  {s.name}
                </span>
                <span
                  className={cn(
                    "text-[10px] tabular-nums",
                    isActive ? "text-ft-ember" : "text-ft-dim",
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
