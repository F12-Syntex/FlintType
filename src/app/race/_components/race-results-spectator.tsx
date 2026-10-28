"use client";

import { Button } from "@/components/ui/button";
import { useRace } from "./race-state";
import { RaceStandings } from "./race-standings";
import type { Racer } from "./race-types";
import { useLeaveRace } from "./use-leave-race";

/** Results card for someone who WATCHED the race (joined a lobby that
 *  had already started, so they never had a seat). Same card shape as
 *  the racer's results (ui-law §21), minus the personal stats: who won,
 *  the full standings, and one way forward — "Find a race", which drops
 *  the spectator seat and returns to the launcher. Without it a watcher
 *  was left on a dead "Everyone finished." screen with no action. */
export function SpectatorResults() {
  const { state } = useRace();
  const leave = useLeaveRace();
  const total = state.racers.length;
  const ordered = [...state.racers].sort(
    (a, b) => (a.place ?? 99) - (b.place ?? 99),
  );
  const rankOf = (r: Racer) => r.place ?? total;
  const winner = ordered.find((r) => r.place === 1 && !r.disconnected) ?? null;

  return (
    <div className="flex shrink-0 flex-col gap-6 rounded-2xl border border-border bg-card p-4 shadow-card sm:gap-8 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5 px-1">
          <span className="text-xs font-medium text-muted-foreground">
            Race finished
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {winner ? `${winner.name} won` : "Race over"}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            You watched this one. Find a race to type in the next.
          </p>
        </div>
        <Button size="lg" onClick={leave} className="w-full px-8 sm:w-auto">
          Find a race
        </Button>
      </div>
      <RaceStandings ordered={ordered} rankOf={rankOf} />
    </div>
  );
}
