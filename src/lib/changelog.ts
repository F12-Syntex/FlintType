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
