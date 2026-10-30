/** A time as the Biogram prints it: whole milliseconds, rounded exactly
 *  as `toFixed(0)` rounds the Mean time cells and the usual-pace tiles. */
export function shownMs(ms: number): number {
  return Number(ms.toFixed(0));
}

/** How far a pattern's mean sits from its category's usual time, in the
 *  whole milliseconds the reader sees: the shown mean minus the shown
 *  usual pace. So "152 ms" beside a usual "71 ms" is 81, never the 80
 *  that the unrounded gap would give. Null while there is no usual pace
 *  yet, or when either time isn't a real number. */
export function baselineDeltaMs(meanMs: number, baseline: number): number | null {
  if (!(baseline > 0) || !Number.isFinite(baseline) || !Number.isFinite(meanMs)) {
    return null;
  }
  return shownMs(meanMs) - shownMs(baseline);
}
