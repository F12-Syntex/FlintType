"use client";

import { RaceLauncher } from "./race-launcher";
import { RaceResults } from "./race-results";
import { useRace } from "./race-state";
import { RaceSurface } from "./race-surface";

/** Body of the race page. Phase-routed:
 *
 *    - **idle** (queue, no room) — the centred `<RaceLauncher>`.
 *    - **joining** (queue, room handle but no snapshot yet) — on a
 *      private-lobby link, a quiet "Joining lobby…" line. (On /race the
 *      launcher stays up with a disabled "Finding race…" button.)
 *    - **race over** (`phase === "finished"`) — the results card FIRST so
 *      your place is above the fold, then the passage you typed below it.
 *    - **you finished, room still racing** — keep the live surface (it
 *      swaps to a spectator view of the racers still going) with your
 *      provisional results beneath, so you can watch the rest finish.
 *    - **mid / pre-race** — just the surface.
 *
 *  During the race the surface is held in a fixed, non-scrolling region
 *  (matching the compact practice chrome — the typing area must never
 *  jump). Once results show — which can be taller than the viewport —
 *  the body scrolls, so the results card isn't clipped by AppChrome's
 *  `overflow-hidden` compact shell. No horizontal padding: AppChrome
 *  owns the page gutter and the page column caps the width. */
export function RaceBody() {
  const { state, onlineRoomId, challengeSlug } = useRace();
  const you = state.racers.find((r) => r.isYou);
  const raceOver = state.phase === "finished";
  const youFinished = you?.finishedAt != null;

  if (state.phase === "queue") {
    if (challengeSlug && onlineRoomId) {
      return (
        <div className="flex flex-1 items-center justify-center py-16">
          <span
            role="status"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground"
          >
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse"
            />
            Joining lobby…
          </span>
        </div>
      );
    }
    return <RaceLauncher />;
  }

  // The launcher carries the visible h1; every other phase keeps a
  // screen-reader-only one so the page always has exactly one (SEO S6).
  const srTitle = <h1 className="sr-only">Race</h1>;

  if (raceOver) {
    return (
      <div className="-mx-3 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 pt-3 pb-10 sm:gap-8 sm:pt-6">
        {srTitle}
        <RaceResults />
        {/* The passage you typed, kept readable under the results. A real
         *  height so the passage (which centres + clips to its box)
         *  doesn't collapse inside the scrolling column. */}
        <div className="flex min-h-48 shrink-0 flex-col">
          <RaceSurface />
        </div>
      </div>
    );
  }

  if (youFinished) {
    return (
      <div className="-mx-3 flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 pt-3 pb-10 sm:gap-8 sm:pt-4">
        {srTitle}
        <div className="flex min-h-[45vh] shrink-0 flex-col">
          <RaceSurface />
        </div>
        <RaceResults />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col pt-3 pb-3 sm:pt-4 sm:pb-6">
      {srTitle}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <RaceSurface />
      </div>
    </div>
  );
}
