/** Compact, human "last active" token: "just now", "5m ago", "2h ago",
 *  "3d ago", "2w ago", then an absolute "May 4" past ~a month. Callers
 *  compose the sentence around it (e.g. `Active ${relativeTime(ms)}`).
 *
 *  Past timestamps only — a future `ms` (clock skew) clamps to "just
 *  now" rather than printing a negative age. `now` is injectable so the
 *  output is deterministic in tests. */
const ABS_FMT = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
});

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 4 * WEEK;

export function relativeTime(ms: number, now: number = Date.now()): string {
  const diff = now - ms;
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d ago`;
  if (diff < MONTH) return `${Math.floor(diff / WEEK)}w ago`;
  return ABS_FMT.format(ms);
}
