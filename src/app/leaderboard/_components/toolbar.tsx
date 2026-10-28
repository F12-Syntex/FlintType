"use client";

import type { ReactNode } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import { InlineFilters, TOOLBAR_SWITCH } from "./filter-controls";
import { FilterSheet } from "./filter-sheet";
import { VIEWS } from "./filters";
import { useLeaderboardParams } from "./use-leaderboard-params";

/** The one toolbar above the board (replaces the old 18-item rail).
 *
 *  - md+: one row. View switch, Mode / Window / Length / audience, and
 *    the icon actions pushed right with `ml-auto`. Wraps per control on
 *    narrow tablets.
 *  - Phones: the View switch shares the first row with the actions; a
 *    full-width pill naming the current slice (opens the filter sheet)
 *    takes the second row, so the summary never truncates.
 *
 *  The actions render twice (one copy per breakpoint, the other is
 *  `display: none`) so DOM order is visual order at every width and Tab
 *  walks left to right, top to bottom. Their state lives in the frame,
 *  so both copies agree.
 *
 *  `filters` is the effective slice (see `useLeaderboardParams`), so a
 *  friends link opened signed out is summarised as the global board. */
export function LeaderboardToolbar({ actions }: { actions: ReactNode }) {
  const { filters, setFilters, signedIn } = useLeaderboardParams();
  const showFilters = filters.view === "table";

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-3 md:gap-y-2">
      <SegmentedControl
        ariaLabel="Leaderboard view"
        value={filters.view}
        onValueChange={(view) => setFilters({ view })}
        options={VIEWS.map((v) => ({ value: v.id, label: v.label }))}
        className={cn(
          TOOLBAR_SWITCH,
          "min-w-0 flex-1 [&>button]:flex-auto [&>button]:px-2.5 [&>button]:whitespace-nowrap",
          "md:flex-none md:[&>button]:flex-none md:[&>button]:px-3",
        )}
      />
      <div className="flex shrink-0 md:hidden">{actions}</div>
      {showFilters ? (
        <>
          <FilterSheet
            filters={filters}
            setFilters={setFilters}
            signedIn={signedIn}
          />
          <InlineFilters
            filters={filters}
            setFilters={setFilters}
            signedIn={signedIn}
          />
        </>
      ) : null}
      <div className="ml-auto hidden shrink-0 md:flex">{actions}</div>
    </div>
  );
}
