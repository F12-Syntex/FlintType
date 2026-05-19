"use client";

import { cn } from "@/lib/utils";
import type { DrillSpec } from "./drills-data";

/** Filter axes the drills grid supports. To add a new axis (e.g. a tag,
 *  a difficulty band, "warm-up"), append a row to DRILL_FILTERS below;
 *  the chip wiring, count derivation, and `matchesFilter` all read from
 *  this single source. */
export type DrillFilterId =
  | "all"
  | "tailored"
  | "generic"
  | "sudden-death"
  | "burst"
  | "ready";

interface DrillFilter {
  id: DrillFilterId;
  label: string;
  /** Returns true when the drill belongs in the filtered set. */
  match: (drill: DrillSpec) => boolean;
}

export const DRILL_FILTERS: readonly DrillFilter[] = [
  { id: "all", label: "All", match: () => true },
  { id: "tailored", label: "Tailored", match: (d) => d.category === "tailored" },
  { id: "generic", label: "Generic", match: (d) => d.category === "generic" },
  {
    id: "sudden-death",
    label: "Sudden death",
    match: (d) => d.kind === "sudden-death",
  },
  { id: "burst", label: "Burst", match: (d) => d.kind === "burst" },
  { id: "ready", label: "Available now", match: (d) => d.ready },
];

export function matchesFilter(drill: DrillSpec, filter: DrillFilterId): boolean {
  const f = DRILL_FILTERS.find((x) => x.id === filter);
  return f ? f.match(drill) : true;
}

/** Horizontal scroll-snap row of chips with counts. The active chip
 *  paints primary; others read as muted utility. Wraps on wide
 *  viewports, horizontal-scrolls on narrow ones so a growing filter
 *  list never blows out the layout. */
export function DrillsFilters({
  drills,
  active,
  onChange,
}: {
  drills: readonly DrillSpec[];
  active: DrillFilterId;
  onChange: (next: DrillFilterId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Filter drills"
      className="flex flex-wrap gap-2"
    >
      {DRILL_FILTERS.map((filter) => {
        const count = drills.filter(filter.match).length;
        if (count === 0 && filter.id !== "all") return null;
        const isActive = active === filter.id;
        return (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(filter.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors",
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span>{filter.label}</span>
            <span
              className={cn(
                "rounded-sm px-1.5 py-px text-[10px] tabular-nums",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
