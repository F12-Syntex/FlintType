"use client";

import { formatClock } from "@/lib/format-duration";
import { cn } from "@/lib/utils";
import type { Racer } from "./race-types";

/** Grid template for the standings table. Below `sm` only rank, name,
 *  WPM and time show, so the name column keeps real width at 375px; raw
 *  and accuracy join from `sm`. */
const GRID =
  "grid grid-cols-[1.5rem_minmax(0,1fr)_3.5rem_3.5rem] items-baseline gap-3 sm:grid-cols-[1.75rem_minmax(0,1fr)_4rem_4rem_3.5rem_4rem]";

/** Post-race standings: one row per racer in finishing order. Your row
 *  is highlighted (orange tint, orange rank + WPM); everyone else's
 *  numbers stay ink so your result is the one that reads. */
export function RaceStandings({
  ordered,
  rankOf,
}: {
  ordered: readonly Racer[];
  rankOf: (r: Racer) => number;
}) {
  return (
    // -mx-2 + row px-3 lands row text on the card's 4px content inset,
    // while your highlighted row's tint reaches a little wider.
    <section aria-label="Standings" className="-mx-2 flex flex-col gap-2">
      <h3 className="px-3 text-sm font-semibold text-foreground">Standings</h3>
      <div role="table" aria-label="Race standings" className="flex flex-col">
        <div
          role="row"
          className={cn(GRID, "px-3 pb-2 text-xs text-muted-foreground")}
        >
          <span role="columnheader">#</span>
          <span role="columnheader">Racer</span>
          <span role="columnheader" className="text-right">
            WPM
          </span>
          <span role="columnheader" className="hidden text-right sm:block">
            Raw
          </span>
          <span role="columnheader" className="hidden text-right sm:block">
            Acc
          </span>
          <span role="columnheader" className="text-right">
            Time
          </span>
        </div>
        {ordered.map((r) => {
          const rank = rankOf(r);
          const racing = r.finishedAt == null && !r.disconnected;
          return (
            <div
              key={r.id}
              role="row"
              aria-current={r.isYou ? "true" : undefined}
              className={cn(
                GRID,
                "rounded-xl px-3 py-2.5 text-sm",
                r.isYou && "bg-primary/10",
              )}
            >
              <span
                role="cell"
                className={cn(
                  "tabular-nums",
                  r.isYou ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                {rank}
              </span>
              <span
                role="cell"
                className={cn(
                  "flex min-w-0 items-center gap-1.5",
                  r.isYou ? "font-semibold text-foreground" : "text-foreground",
                )}
              >
                <span className="truncate">{r.name}</span>
                {r.bot != null ? (
                  <span
                    aria-label="Bot opponent"
                    className="inline-flex shrink-0 items-center rounded-pill bg-muted px-1.5 py-px text-[10px] font-medium text-muted-foreground"
                  >
                    Bot
                  </span>
                ) : null}
                {r.disconnected ? (
                  <span className="shrink-0 text-xs text-muted-foreground">left</span>
                ) : null}
              </span>
              <span
                role="cell"
                className={cn(
                  "text-right font-semibold tabular-nums",
                  r.isYou ? "text-primary" : "text-foreground",
                )}
              >
                {r.wpm}
              </span>
              <span
                role="cell"
                className="hidden text-right tabular-nums text-muted-foreground sm:block"
              >
                {r.raw}
              </span>
              <span
                role="cell"
                className="hidden text-right tabular-nums text-muted-foreground sm:block"
              >
                {Math.round(r.accuracy)}%
              </span>
              <span
                role="cell"
                className="text-right tabular-nums text-muted-foreground"
              >
                {racing ? (
                  <span className="text-xs">Racing…</span>
                ) : (
                  formatClock(r.finishedAt ?? 0)
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
