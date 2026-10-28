"use client";

import { useState } from "react";
import { appendTraceSample } from "./race-trace-samples";
import type { Racer, RacePhase, TraceSample } from "./race-types";

/** Records the post-race speed chart's samples on the client: once per
 *  race second while the room is racing, every racer's live WPM (see
 *  `appendTraceSample`). The server never sends a history, so the chart
 *  is built from the snapshots this client saw. The race subtree
 *  re-mounts per round, so a rematch starts from an empty trace.
 *
 *  Derived during render (React's "adjust state from props" pattern):
 *  `appendTraceSample` returns the same array unless a new second has
 *  elapsed, so the guarded setState runs at most once per second and
 *  never loops. */
export function useRaceTrace(
  phase: RacePhase,
  elapsedSeconds: number,
  racers: readonly Racer[],
): readonly TraceSample[] {
  const [samples, setSamples] = useState<readonly TraceSample[]>([]);
  if (phase === "racing") {
    const next = appendTraceSample(samples, elapsedSeconds, racers);
    if (next !== samples) setSamples(next);
  }
  return samples;
}
