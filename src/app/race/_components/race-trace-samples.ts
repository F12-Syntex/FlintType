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
 *  - A racer is sampled while racing, plus the first sample taken once
 *    they show as crossed (so their line ends at their final speed),
 *    and never after leaving. Their line stops there instead of running
 *    flat to the end of the chart.
 *
 *  "Already ended" is recorded on the sample (`finished`), not inferred
 *  from `finishedAt`: that is floored to whole seconds, and the sample
 *  for a second is taken as the second starts, so a racer who crossed
 *  at 11.7s has `finishedAt` 11 while sample 11 still shows them
 *  racing. Comparing the two dropped the final point (and "Your peak"
 *  read below your result). The last racer to cross never shows as
 *  crossed in a racing snapshot at all; `closeTraceSamples` takes their
 *  final point when the race ends.
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
  const ended = new Set(samples.flatMap((s) => s.finished ?? []));
  const wpmByRacer: Record<string, number> = {};
  const finished: string[] = [];
  for (const r of racers) {
    if (r.disconnected) continue;
    if (r.finishedAt != null) {
      // Their final point is already on the chart.
      if (ended.has(r.id)) continue;
      finished.push(r.id);
    }
    wpmByRacer[r.id] = Math.max(0, Math.round(r.wpm));
  }
  if (Object.keys(wpmByRacer).length === 0) return samples;
  return [...samples, finished.length > 0 ? { t, wpmByRacer, finished } : { t, wpmByRacer }];
}

/** Record each racer's final point when the race ends.
 *
 *  The server stamps the last racer's finish (or, at the time limit,
 *  everyone's) and flips the room to "finished" in the same broadcast,
 *  so no racing snapshot ever shows them crossed and `appendTraceSample`
 *  never takes their final speed. Call this once, on the first finished
 *  snapshot, with `t` = the race-clock second the race ended:
 *  - Later than the last sample: appended like any other sample.
 *  - The same second (or earlier, from clock drift): one second holds
 *    one sample, so the last sample takes the final speeds in place.
 *
 *  Racers whose final point is already on the chart are left alone.
 *  Returns the same array when nothing changed. */
export function closeTraceSamples(
  samples: readonly TraceSample[],
  t: number,
  racers: readonly TraceRacer[],
): readonly TraceSample[] {
  const last = samples[samples.length - 1];
  if (!last) return appendTraceSample(samples, t, racers);
  if (t > last.t) {
    const appended = appendTraceSample(samples, t, racers);
    if (appended !== samples) return appended;
  }
  const ended = new Set(samples.flatMap((s) => s.finished ?? []));
  const wpmByRacer = { ...last.wpmByRacer };
  const finished = [...(last.finished ?? [])];
  for (const r of racers) {
    if (r.disconnected || ended.has(r.id)) continue;
    wpmByRacer[r.id] = Math.max(0, Math.round(r.wpm));
    finished.push(r.id);
  }
  if (finished.length === (last.finished?.length ?? 0)) return samples;
  return [...samples.slice(0, -1), { t: last.t, wpmByRacer, finished }];
}
