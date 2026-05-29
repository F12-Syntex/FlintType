/** Clock-style elapsed/duration token: `m:ss` with an unbounded minute
 *  field (e.g. `0:24`, `1:05`, `83:20`). Input is whole seconds; callers
 *  holding milliseconds divide first. Negative / fractional inputs clamp
 *  and floor so a slightly-skewed clock never prints `-1` or a decimal.
 *
 *  This is the single source for the timer `m:ss` shown on the live
 *  readouts, the race results, and the share card. The profile's
 *  total-time stat uses a different humanised form (`5s` / `3m` /
 *  `1:02:03`); that one stays local to that surface. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}
