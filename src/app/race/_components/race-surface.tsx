"use client";

import { RACE_MODES } from "./race-data";
import { BurstRaceSurface } from "./burst-surface";
import { RacePassage } from "./passage";
import { useRace } from "./race-state";

/** Thin client switch between the passage surface and the burst
 *  surface. Lives in its own file so the race page can stay a server
 *  component while still routing to the right surface per mode. */
export function RaceSurface() {
  const { modeId } = useRace();
  const mode = RACE_MODES[modeId];
  return mode.kind === "burst" ? <BurstRaceSurface /> : <RacePassage />;
}
