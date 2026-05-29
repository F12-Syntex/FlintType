"use client";

import { RaceResults } from "./race-results";
import { useRace } from "./race-state";
import { RaceSurface } from "./race-surface";

/** Body of the race page: the typing surface, plus the results panel
 *  once the local racer finishes.
 *
 *  Three layouts:
 *    - **race over** (`phase === "finished"`) — the results screen
 *      *replaces* the typing surface entirely. There's nothing left to
 *      type, so the writer and the live roster make way for the final
 *      standings, stats, and rematch CTA.
 *    - **you finished, room still racing** — keep the live surface (it
 *      swaps to a spectator view of the racers still going) and show
 *      your results beneath, so you can watch the rest finish.
 *    - **mid / pre-race** — just the surface.
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
  const raceOver = state.phase === "finished";
  const youFinished = you?.finishedAt != null;

  // Race over, OR you've finished while the room runs on → keep the
  // passage visible (so you can still read what you typed) with the
  // results panel beneath it. (Previously a finished race dropped the
  // writer entirely; the text should stay.)
  if (raceOver || youFinished) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pt-4 pb-8 sm:gap-6 sm:px-12 sm:py-8 lg:px-20">
        {/* Give the surface a real height so the passage (which centres
         *  + clips to its container) doesn't collapse to nothing inside
         *  the scrolling results column — that's what was hiding the
         *  text. Results scroll beneath it. */}
        <div className="flex min-h-[55vh] shrink-0 flex-col">
          <RaceSurface />
        </div>
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
