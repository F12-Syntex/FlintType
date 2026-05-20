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
