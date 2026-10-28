"use client";

import { useUser } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { InlineFilters, TOOLBAR_SWITCH } from "./filter-controls";
import { FilterSheet } from "./filter-sheet";
import { VIEWS } from "./filters";
import { useLeaderboardParams } from "./use-leaderboard-params";

/** The one toolbar above the board (replaces the old 18-item rail).
 *
 *  - md+: a single row — View switch, then Mode / Window / Length /
 *    audience, with the icon actions pinned right. Controls wrap one by
 *    one on narrow tablets.
 *  - Phones: the View switch shares a row with the icon actions, and a
 *    full-width pill naming the current slice opens the filter sheet.
 *
 *  The filters only shape the Best runs view, so they hide on Players
 *  and Level. */
export function LeaderboardToolbar({ actions }: { actions: ReactNode }) {
  const { filters, setFilters } = useLeaderboardParams();
  const { isSignedIn } = useUser();
  const signedIn = !!isSignedIn;
  const showFilters = filters.view === "table";

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-2">
      <div className="flex items-center gap-2 md:contents">
        <SegmentedControl
          ariaLabel="Leaderboard view"
          value={filters.view}
          onValueChange={(view) => setFilters({ view })}
          options={VIEWS.map((v) => ({ value: v.id, label: v.label }))}
          className={`${TOOLBAR_SWITCH} min-w-0 flex-1 [&>button]:flex-auto [&>button]:px-2.5 [&>button]:whitespace-nowrap md:flex-none md:[&>button]:flex-none md:[&>button]:px-3`}
        />
        <div className="flex shrink-0 md:order-last md:ml-auto">{actions}</div>
      </div>
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
    </div>
  );
}
