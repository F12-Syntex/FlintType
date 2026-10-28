"use client";

import type { ReactNode } from "react";

import { Surface } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shared table for every leaderboard view (best runs, players, level).
 *  One grid template for the header row and every row (`board-row.tsx`)
 *  keeps the columns aligned:
 *    phones: #  Player (with a one-line summary)  headline
 *    md+:    #  Player  col1  col2  col3  headline
 *  Don't fork: a new view supplies its column labels and cells. */
export const ROW_GRID =
  "grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 px-4 sm:px-5 md:grid-cols-[2.5rem_minmax(0,1fr)_8rem_4.5rem_4.5rem_4.5rem] md:gap-x-4";

/** Sizing for buttons inside the board's empty and error states: 44px
 *  and full width on phones (touch floor), the default 36px inline from
 *  `sm`. */
export const STATE_CTA = "h-11 w-full sm:h-9 sm:w-auto";

export type BoardColumns = {
  /** Labels for the three md+ detail columns (first is left-aligned,
   *  the other two are numeric and right-aligned). */
  cells: readonly [string, string, string];
  /** Label for the right-hand headline column (e.g. "WPM", "Level"). */
  headline: string;
};

export function LeaderboardBoard({
  columns,
  loading,
  error,
  onRetry,
  children,
}: {
  columns: BoardColumns;
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  children?: ReactNode;
}) {
  return (
    <Surface className="overflow-hidden">
      <div
        aria-hidden
        className={cn(
          ROW_GRID,
          "h-11 border-b border-border text-xs font-medium text-muted-foreground",
        )}
      >
        <span className="text-center">#</span>
        <span>Player</span>
        <span className="hidden md:block">{columns.cells[0]}</span>
        <span className="hidden text-right md:block">{columns.cells[1]}</span>
        <span className="hidden text-right md:block">{columns.cells[2]}</span>
        <span className="text-right">{columns.headline}</span>
      </div>
      {error ? (
        <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
          {onRetry ? (
            <Button
              type="button"
              variant="outline"
              onClick={onRetry}
              className={cn(STATE_CTA, "max-w-xs")}
            >
              Try again
            </Button>
          ) : null}
        </div>
      ) : loading ? (
        <SkeletonRows />
      ) : (
        <ol className="divide-y divide-border/60">{children}</ol>
      )}
    </Surface>
  );
}

function SkeletonRows() {
  return (
    <ul aria-label="Loading leaderboard" className="divide-y divide-border/60">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i} className={cn(ROW_GRID, "h-16 motion-safe:animate-pulse")}>
          <span className="mx-auto size-7 rounded-full bg-muted" />
          <span className="h-3.5 w-32 max-w-full rounded-full bg-muted" />
          <span className="hidden h-6 w-24 rounded-full bg-muted md:block" />
          <span className="ml-auto hidden h-3.5 w-8 rounded-full bg-muted md:block" />
          <span className="ml-auto hidden h-3.5 w-10 rounded-full bg-muted md:block" />
          <span className="ml-auto h-4 w-10 rounded-full bg-muted" />
        </li>
      ))}
    </ul>
  );
}

/** Static skeleton for the page's Suspense fallback (no function props,
 *  so the server can render it). */
export function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-3 md:gap-2">
      <div className="h-11 w-full rounded-pill bg-muted/70 md:h-10 md:w-80" />
      <LeaderboardBoard
        columns={{ cells: ["When", "Raw", "Acc"], headline: "WPM" }}
        loading
      />
    </div>
  );
}

/** Empty board: a dashed card (ui-law §17.3) with one sentence and the
 *  action that is most likely to fill it. Actions stack full width on
 *  phones; give each one `STATE_CTA`. */
export function EmptyBoard({
  message,
  actions,
}: {
  message: string;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center">
      <p className="max-w-md text-sm leading-relaxed text-foreground sm:text-[15px]">
        {message}
      </p>
      <div className="flex w-full max-w-xs flex-col gap-2 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
        {actions}
      </div>
    </div>
  );
}
