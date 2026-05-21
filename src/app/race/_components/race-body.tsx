"use client";

import { RaceResults } from "./race-results";
import { useRace } from "./race-state";
import { RaceSurface } from "./race-surface";

/** Body of the race page: the typing surface, plus the results panel
 *  once the local racer finishes.
 *
 *  During the race the surface is held in a fixed, non-scrolling region
 *  (matching the compact practice chrome — the typing area must never
 *  jump). Once results show — which can be taller than the viewport on
 *  short screens — the whole body becomes scrollable, so the results
 *  panel isn't clipped by AppChrome's `overflow-hidden` (the compact
 *  chrome the race page mounts in). */
export function RaceBody() {
  const { state } = useRace();
  const you = state.racers.find((r) => r.isYou);
  const showResults = state.phase === "finished" || you?.finishedAt != null;

  if (showResults) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-4 pb-8 sm:gap-6 sm:px-12 sm:py-8 lg:px-20">
        <RaceSurface />
        <RaceResults />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-4 pb-3 sm:gap-6 sm:px-12 sm:py-8 lg:px-20">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <RaceSurface />
      </div>
    </div>
  );
}
