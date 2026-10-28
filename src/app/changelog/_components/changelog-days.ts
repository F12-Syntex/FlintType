import { type ChangelogEntry, compareVersions, isInternalLine } from "@/lib/changelog";

/** Pure grouping for the /changelog page. `public/CHANGELOG.md` keeps
 *  one section per version; the page shows one block per calendar day,
 *  each day split into its releases (one sub-head per version) so a busy
 *  release day stays skimmable. Internal-only lines are dropped. */

/** One release as the page renders it: its version and the user-facing
 *  lines it shipped. */
export type ChangelogRelease = { version: string; lines: string[] };

/** One calendar day of releases. */
export type ChangelogDay = {
  /** The date exactly as written in the file ("27 October 2026"). */
  date: string;
  /** `YYYY-MM-DD` for `<time dateTime>` and anchors; null when the
   *  heading carries no day (e.g. "May 2026"). */
  iso: string | null;
  /** Oldest and newest version shipped that day (equal for one). */
  from: string;
  to: string;
  /** Every version that day, newest first (file order), including
   *  internal-only ones, so update-card links still resolve. */
  versions: string[];
  /** Releases with something user-facing, newest first. A line already
   *  listed by a newer release that day is not repeated. */
  releases: ChangelogRelease[];
  /** Total user-facing lines across `releases`. */
  lineCount: number;
};

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** Parse a changelog date ("27 October 2026") to a UTC `Date`. Returns
 *  null for anything without a day, month name and year. */
export function parseChangelogDate(date: string): Date | null {
  const m = /^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i.exec(date.trim());
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].toLowerCase());
  if (month < 0) return null;
  const day = Number(m[1]);
  const parsed = new Date(Date.UTC(Number(m[3]), month, day));
  // Reject overflow like "31 June" rolling into July.
  return parsed.getUTCMonth() === month ? parsed : null;
}

/** Group entries (newest first) into one block per date heading, in
 *  first-seen order. Days left with no user-facing lines are dropped:
 *  the raw file at /CHANGELOG.md still lists every version. */
export function groupChangelogByDay(entries: ChangelogEntry[]): ChangelogDay[] {
  const byDate = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const list = byDate.get(entry.date);
    if (list) list.push(entry);
    else byDate.set(entry.date, [entry]);
  }

  const days: ChangelogDay[] = [];
  for (const [date, dayEntries] of byDate) {
    const seen = new Set<string>();
    const releases: ChangelogRelease[] = [];
    for (const entry of dayEntries) {
      const lines = entry.lines.filter((line) => {
        if (isInternalLine(line) || seen.has(line)) return false;
        seen.add(line);
        return true;
      });
      if (lines.length > 0) releases.push({ version: entry.version, lines });
    }
    if (releases.length === 0) continue;
    const versions = dayEntries.map((e) => e.version);
    const sorted = [...versions].sort(compareVersions);
    const parsed = parseChangelogDate(date);
    days.push({
      date,
      iso: parsed ? parsed.toISOString().slice(0, 10) : null,
      from: sorted[0],
      to: sorted[sorted.length - 1],
      versions,
      releases,
      lineCount: seen.size,
    });
  }
  return days;
}

/** Split days into the ones within `windowDays` of the newest dated
 *  day (shown open) and everything older (folded away). Anchoring on
 *  the newest release rather than "today" keeps the latest month of
 *  work visible however long it's been since the last release. Days
 *  without a parseable date count as older. */
export function splitRecentDays(
  days: ChangelogDay[],
  windowDays = 30,
): { recent: ChangelogDay[]; older: ChangelogDay[] } {
  const times = days
    .map((d) => (d.iso ? Date.parse(d.iso) : Number.NaN))
    .filter((t) => !Number.isNaN(t));
  if (times.length === 0) return { recent: [], older: days };
  const cutoff = Math.max(...times) - windowDays * 24 * 60 * 60 * 1000;
  const recent: ChangelogDay[] = [];
  const older: ChangelogDay[] = [];
  for (const day of days) {
    const t = day.iso ? Date.parse(day.iso) : Number.NaN;
    if (!Number.isNaN(t) && t >= cutoff) recent.push(day);
    else older.push(day);
  }
  return { recent, older };
}

/** Bucket days by "<Month> <Year>" in first-seen order, for the folded
 *  archive of older releases. */
export function groupDaysByMonth(
  days: ChangelogDay[],
): { month: string; days: ChangelogDay[] }[] {
  const months: { month: string; days: ChangelogDay[] }[] = [];
  for (const day of days) {
    const month = day.date.replace(/^\d{1,2}\s+/, "");
    const bucket = months.find((m) => m.month === month);
    if (bucket) bucket.days.push(day);
    else months.push({ month, days: [day] });
  }
  return months;
}

/** The releases shown open on a day, and the rest folded behind a
 *  "Show N more changes" row. Whole releases only (a release is never
 *  cut in half), and always at least one, so the open part holds about
 *  `limit` lines. */
export function previewReleases(
  releases: ChangelogRelease[],
  limit = 8,
): { shown: ChangelogRelease[]; rest: ChangelogRelease[]; restCount: number } {
  let count = 0;
  let cut = 0;
  while (cut < releases.length && (cut === 0 || count < limit)) {
    count += releases[cut].lines.length;
    cut += 1;
  }
  const rest = releases.slice(cut);
  return {
    shown: releases.slice(0, cut),
    rest,
    restCount: rest.reduce((sum, r) => sum + r.lines.length, 0),
  };
}

/** "v6.148.6" for one version, "v6.137.0 – v6.148.6" for a range. */
export function versionRangeLabel(from: string, to: string): string {
  return from === to ? `v${to}` : `v${from} – v${to}`;
}
