/** Convert a recorded per-second WPM trace into cumulative typed-char
 *  positions per second, for pacing a ghost marker.
 *
 *  Each sample is the *cumulative-average* WPM at that second (the
 *  TypingSurface sampler stores `correctChars / 5 / totalElapsedMinutes`),
 *  so the cumulative char count at sample `i` (which is second `i + 1`)
 *  is exactly `wpm * 5 * (i + 1) / 60`.
 *
 *  This is deliberately NOT an integration of per-second rates. The
 *  samples are already cumulative averages; re-summing them as if each
 *  were an instantaneous one-second rate badly undercounts on any run
 *  that speeds up (i.e. every real run), making the ghost crawl. */
export function ghostCumulativeChars(samples: readonly number[]): number[] {
  return samples.map((wpm, i) => (Math.max(0, wpm) * 5 * (i + 1)) / 60);
}
