"use client";

import { playerColorFor, progressOf } from "./race-data";
import type { Racer } from "./race-types";

/** Mini player-position strip that paints below the race passage
 *  when the multiplayerPlayerColors appearance pref is on. The
 *  horizontal line represents the full passage from 0% to 100%;
 *  each racer (incl. you) gets a coloured tick positioned at their
 *  live correct-chars percent. This is the "where everyone is in
 *  the reader" affordance without trying to overlay text on top of
 *  the practice Passage component (which manages its own
 *  smooth-line-scroll and would fight any absolute overlay). */
export function RacePlayerStrip({
  racers,
  totalChars,
}: {
  racers: readonly Racer[];
  totalChars: number;
}) {
  const joined = racers.filter((r) => r.joinedAt != null);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
        <span>Live opponent positions</span>
        <span className="tabular-nums">0 → 100%</span>
      </div>
      <div className="relative h-[6px] w-full rounded-sm bg-muted">
        {[0.25, 0.5, 0.75].map((t) => (
          <span
            key={t}
            aria-hidden
            className="absolute top-0 bottom-0 w-px bg-foreground/15"
            style={{ left: `${t * 100}%` }}
          />
        ))}
        {joined.map((r) => {
          const pct = progressOf(r.correctChars, totalChars) * 100;
          return (
            <span
              key={r.id}
              role="img"
              aria-label={`${r.name} at ${Math.round(pct)} percent`}
              className="absolute top-1/2 h-3 w-[5px] -translate-y-1/2 rounded-sm transition-[left] duration-100"
              style={{
                left: `calc(${pct}% - 2.5px)`,
                backgroundColor: playerColorFor(r.id),
                boxShadow: "0 0 0 1px var(--background)",
              }}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
        {joined.map((r) => (
          <span key={r.id} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="size-2 rounded-sm"
              style={{ backgroundColor: playerColorFor(r.id) }}
            />
            <span className={r.isYou ? "text-primary" : "text-foreground"}>
              {r.name}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
