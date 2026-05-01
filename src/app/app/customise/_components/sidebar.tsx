"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SECTIONS } from "./data";

/** Section navigation for the Settings layout. Each entry is a real
 *  Next.js route (`/app/customise/<id>`); the active one is detected via
 *  usePathname. Mobile collapses the sidebar into a horizontal scroll
 *  strip above the active page. */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Settings sections"
      className="overflow-x-auto border-b border-ft-line-soft py-3 lg:border-r lg:border-b-0 lg:py-6"
    >
      <ul className="flex gap-0 lg:flex-col">
        {SECTIONS.map((s) => {
          const href = `/app/customise/${s.id}`;
          const isActive = pathname === href;
          return (
            <li key={s.id} className="shrink-0">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex w-full items-center justify-between gap-3 border-l-2 px-5 py-2.5 transition-colors",
                  isActive
                    ? "border-ft-ember bg-ft-ember/[0.06]"
                    : "border-transparent hover:bg-ft-ink/[0.03]",
                )}
              >
                <span
                  className={cn(
                    "text-[11px] tracking-[0.14em]",
                    isActive
                      ? "font-semibold text-ft-ink"
                      : "text-ft-dim-2",
                  )}
                >
                  {s.name}
                </span>
                <span className="text-[10px] tabular-nums text-ft-dim">
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
