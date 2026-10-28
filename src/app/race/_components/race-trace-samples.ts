import type { TraceSample } from "./race-types";

/** The slice of a racer the speed trace needs. */
export type TraceRacer = {
  id: string;
  wpm: number;
  /** Race-clock seconds when the racer crossed the line, or null. */
  finishedAt: number | null;
  disconnected: boolean;
};

/** Cap on stored samples (one per race second). A timed race is at
 *  most a minute and a long quote a few minutes; this only guards a
 *  runaway room from growing the array without bound. */
export const MAX_TRACE_SAMPLES = 600;

/** Append one per-second speed sample for the post-race chart.
 *
 *  - Second 0 is skipped (nobody has a meaningful WPM before the first
 *    second of the race has elapsed).
 *  - One sample per second: a `t` that isn't later than the last
 *    sample's is ignored, so re-renders inside the same second (or a
 *    clock that steps backwards) never duplicate or reorder points.
 *  - A racer is sampled while racing, plus the first sample after they
 *    crossed (so their line ends at their final speed), and never after
 *    leaving. Their line stops there instead of running flat to the end
 *    of the chart.
 *
 *  Returns the same array when nothing was added, so callers can use
 *  reference equality to skip a state update. */
export function appendTraceSample(
  samples: readonly TraceSample[],
  t: number,
  racers: readonly TraceRacer[],
): readonly TraceSample[] {
  if (!Number.isFinite(t) || t < 1) return samples;
  const last = samples[samples.length - 1];
  if (last && t <= last.t) return samples;
  if (samples.length >= MAX_TRACE_SAMPLES) return samples;
  const wpmByRacer: Record<string, number> = {};
  let any = false;
  for (const r of racers) {
    if (r.disconnected) continue;
    // Still racing, or crossed since the previous sample.
    const sampled = r.finishedAt == null || r.finishedAt > (last?.t ?? 0);
    if (!sampled) continue;
    wpmByRacer[r.id] = Math.max(0, Math.round(r.wpm));
    any = true;
  }
  if (!any) return samples;
  return [...samples, { t, wpmByRacer }];
}
