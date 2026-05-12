"use client";

import { cn } from "@/lib/utils";
import { progressOf } from "./race-data";
import { useRace } from "./race-state";
import type { Racer } from "./race-types";

/** Leaderboard strip across the top of the race surface. Sorts by
 *  progress while racing and by final place when finished. Only the
 *  human's bar carries primary; bots stay neutral so the brand spark
 *  remains the user's anchor. */
export function RaceLanes() {
  const { state } = useRace();
  const racers = sortRacers(state.racers, state.phase);
  return (
    <div className="flex flex-col gap-3">
      {racers.map((r, i) => (
        <Lane
          key={r.id}
          racer={r}
          pos={i + 1}
          totalChars={state.totalChars}
        />
      ))}
    </div>
  );
}

function Lane({
  racer,
  pos,
  totalChars,
}: {
  racer: Racer;
  pos: number;
  totalChars: number;
}) {
  const prog = progressOf(racer.correctChars, totalChars);
  const status = racer.place != null ? `PLACE ${racer.place}` : racer.badge;
  return (
    <div className="grid grid-cols-[28px_1fr_auto] items-center gap-3 sm:grid-cols-[36px_240px_1fr_90px] sm:gap-3.5">
      <span
        className={cn(
          "text-sm font-bold tabular-nums",
          pos === 1 ? "text-primary" : "text-muted-foreground/70",
        )}
      >
        {String(pos).padStart(2, "0")}
      </span>
      <div className="flex items-center gap-2.5">
        <span className="text-[13px] text-muted-foreground">{racer.flag}</span>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-[13px] font-semibold",
              racer.isYou ? "text-primary" : "text-foreground",
            )}
          >
            {racer.name}
          </span>
          <span
            className={cn(
              "text-[8px] tracking-[0.16em]",
              racer.place === 1 ? "text-primary" : "text-muted-foreground/70",
            )}
          >
            {status}
          </span>
        </div>
      </div>
      <div className="relative col-span-2 h-5 overflow-hidden rounded-sm border border-border bg-muted sm:col-span-1">
        <div
          className={cn(
            "absolute top-0 bottom-0 left-0 transition-[width] duration-100 ease-linear",
            racer.isYou ? "bg-primary" : "bg-foreground/55",
            racer.finishedAt != null && !racer.isYou && "bg-foreground/40",
          )}
          style={{ width: `${prog * 100}%` }}
        />
        {[0.25, 0.5, 0.75].map((t) => (
          <div
            key={t}
            className="absolute top-0 bottom-0 w-px bg-foreground/10"
            style={{ left: `${t * 100}%` }}
            aria-hidden
          />
        ))}
        <div
          className="absolute top-0 right-0 bottom-0 w-1 bg-primary"
          aria-hidden
        />
      </div>
      <div className="flex flex-col items-end">
        <span
          className={cn(
            "text-base font-bold tabular-nums",
            racer.isYou ? "text-primary" : "text-foreground",
          )}
        >
          {racer.wpm}
        </span>
        <span className="text-[9px] tracking-wide text-muted-foreground tabular-nums">
          {Math.round(prog * 100)}% done
        </span>
      </div>
    </div>
  );
}

function sortRacers(racers: readonly Racer[], phase: string): Racer[] {
  const arr = [...racers];
  if (phase === "finished") {
    return arr.sort((a, b) => (a.place ?? 99) - (b.place ?? 99));
  }
  return arr.sort((a, b) => b.correctChars - a.correctChars);
}
