/** Evenly spaced whole-second ticks for the result chart's x-axis.
 *
 *  Recharts' automatic ticks over a `["dataMin", "dataMax"]` domain end
 *  on whatever second the run finished, so the last label was usually
 *  crammed against the one before it ("5s 7s 8s"). This picks a step
 *  that gives at most `intervals` gaps, drops any regular tick that
 *  would sit within half a step of the end, then always closes on
 *  `last` so the run's real length is labelled. */
export function secondTicks(first: number, last: number, intervals = 4): number[] {
  if (!Number.isFinite(first) || !Number.isFinite(last)) return [];
  if (last <= first) return [first];
  const step = Math.max(1, Math.ceil((last - first) / Math.max(1, intervals)));
  const ticks: number[] = [];
  for (let t = first; t < last; t += step) {
    if (last - t > step / 2) ticks.push(t);
  }
  ticks.push(last);
  return ticks;
}
