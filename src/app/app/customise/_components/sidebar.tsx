import { cn } from "@/lib/utils";
import { SECTIONS } from "./data";

/** Left sidebar listing every settings section. Each entry is an in-page
 *  anchor that scrolls the settings panel to that section. The active
 *  highlight is set by the URL hash; on first paint with no hash it
 *  reads as the first section (visually "selected" via aria-current).
 *
 *  Mobile (<lg): the sidebar collapses into a horizontally-scrolling
 *  strip at the top, same layout pattern the old customise-nav used. */
export function Sidebar({ active }: { active?: string }) {
  return (
    <nav
      aria-label="Settings sections"
      className="overflow-x-auto border-b border-ft-line-soft py-3 lg:border-r lg:border-b-0 lg:py-6"
    >
      <ul className="flex gap-0 lg:flex-col">
        {SECTIONS.map((s, i) => {
          const isActive = active ? s.id === active : i === 0;
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                aria-current={isActive ? "true" : undefined}
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
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
