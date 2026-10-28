/** One released version's worth of changelog lines, as parsed from
 *  `public/CHANGELOG.md`. File order is preserved (newest first). */
export type ChangelogEntry = {
  version: string;
  date: string;
  lines: string[];
};

/** Parse the CHANGELOG.md markdown into ordered entries.
 *
 *  Shape it expects (see the file's own header):
 *    ## <version> — <date>
 *    - a change line
 *    - another change line
 *
 *  Everything before the first `##` heading (the intro + `---`) is
 *  ignored. The em-dash separator is canonical; a plain hyphen is
 *  accepted as a fallback. Pure + isomorphic — the page reads the file
 *  off disk and hands the string here, so this stays trivially testable. */
export function parseChangelog(md: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [];
  let current: ChangelogEntry | null = null;

  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = /^##\s+(.+?)\s+[—-]\s+(.+?)$/.exec(line);
    if (heading) {
      current = { version: heading[1].trim(), date: heading[2].trim(), lines: [] };
      entries.push(current);
      continue;
    }
    if (!current) continue;
    const bullet = /^-\s+(.+?)$/.exec(line);
    if (bullet) current.lines.push(bullet[1].trim());
  }

  return entries;
}

/** Compare two dotted version strings numerically, segment by segment.
 *  Returns <0 if `a` is older, 0 if equal, >0 if `a` is newer. Tolerant
 *  of a leading `v`, missing segments (treated as 0), and non-numeric
 *  junk (treated as 0) so a malformed cache value can never throw. */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    v.replace(/^v/i, "").split(".").map((n) => Number.parseInt(n, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** The changelog entries released after `since` and no later than
 *  `current` — i.e. everything new to a user whose last-seen version was
 *  `since`. Input order (newest first) is preserved. */
export function changesSince(
  entries: ChangelogEntry[],
  since: string,
  current: string,
): ChangelogEntry[] {
  return entries.filter(
    (e) =>
      compareVersions(e.version, since) > 0 &&
      compareVersions(e.version, current) <= 0,
  );
}

/** One calendar day of releases, as the /changelog page renders it: the
 *  user-facing lines of every version shipped that day merged into one
 *  list, with the version range kept as small print. */
export type ChangelogDay = {
  /** The date exactly as written in the file ("27 October 2026"). */
  date: string;
  /** `YYYY-MM-DD` for `<time dateTime>` and anchors; null when the
   *  heading carries no day (e.g. "May 2026"). */
  iso: string | null;
  /** Oldest and newest version shipped that day (equal for one). */
  from: string;
  to: string;
  /** Every version that day, newest first (file order). */
  versions: string[];
  /** Merged user-facing lines, newest version first, de-duplicated,
   *  with internal-only lines removed. */
  lines: string[];
};

/** True for a line that only concerns developers — "Internal changes
 *  only.", "Internal: …", "Internal groundwork …". The file's own header
 *  mandates that wording for non-user-facing versions. */
export function isInternalLine(line: string): boolean {
  return /^internal\b/i.test(line.trim());
}

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
 *  the raw file at /changelog.md still lists every version. */
export function groupChangelogByDay(entries: ChangelogEntry[]): ChangelogDay[] {
  const byDate = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const list = byDate.get(entry.date);
    if (list) list.push(entry);
    else byDate.set(entry.date, [entry]);
  }

  const days: ChangelogDay[] = [];
  for (const [date, dayEntries] of byDate) {
    const lines: string[] = [];
    for (const entry of dayEntries) {
      for (const line of entry.lines) {
        if (!isInternalLine(line) && !lines.includes(line)) lines.push(line);
      }
    }
    if (lines.length === 0) continue;
    const versions = dayEntries.map((e) => e.version);
    const sorted = [...versions].sort(compareVersions);
    const parsed = parseChangelogDate(date);
    days.push({
      date,
      iso: parsed ? parsed.toISOString().slice(0, 10) : null,
      from: sorted[0],
      to: sorted[sorted.length - 1],
      versions,
      lines,
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
