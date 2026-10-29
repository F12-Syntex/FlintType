"use client";

import { useState } from "react";
import { appendTraceSample, closeTraceSamples } from "./race-trace-samples";
import type { Racer, RacePhase, TraceSample } from "./race-types";

/** Records the post-race speed chart's samples on the client: once per
 *  race second while the room is racing, every racer's live WPM (see
 *  `appendTraceSample`), then each remaining racer's final speed on the
 *  first finished snapshot (`closeTraceSamples`, at `endSecond`). The
 *  server never sends a history, so the chart is built from the
 *  snapshots this client saw. The race subtree re-mounts per round, so
 *  a rematch starts from an empty trace.
 *
 *  Derived during render (React's "adjust state from props" pattern):
 *  `appendTraceSample` returns the same array unless a new second has
 *  elapsed, and the trace closes once, so the guarded setState runs at
 *  most once per second and never loops. */
export function useRaceTrace(
  phase: RacePhase,
  elapsedSeconds: number,
  endSecond: number,
  racers: readonly Racer[],
): readonly TraceSample[] {
  const [trace, setTrace] = useState<{
    samples: readonly TraceSample[];
    closed: boolean;
  }>({ samples: [], closed: false });
  if (phase === "racing") {
    const next = appendTraceSample(trace.samples, elapsedSeconds, racers);
    if (next !== trace.samples) setTrace({ samples: next, closed: false });
  } else if (phase === "finished" && !trace.closed) {
    setTrace({
      samples: closeTraceSamples(trace.samples, endSecond, racers),
      closed: true,
    });
  }
  return trace.samples;
}
