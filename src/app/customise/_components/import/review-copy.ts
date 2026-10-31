import type { ImportSource, SkipReason } from "@/types/settings-import";
import { COPY, coverPart, settingsCount, type InputKind } from "./import-copy";

/** The Review screen's strings: the intro, the file's tally, the change
 *  tables and the disclosures under them. Same rules as `import-copy.ts`.
 *  Pure. */

/** "32 of your settings differ from sample-settings.json." in parts, so
 *  the file name can be set in its own weight. Counts your settings, not
 *  the file's: one setting in a file can set several here (a custom
 *  theme sets every colour). It says what differs, not what the import
 *  does, so it holds whichever groups are switched on, and with the
 *  settings that already match it adds up to `bridgeLine`. */
export function reviewIntro(n: number, file: string | null): [string, string, string] {
  return [`${n} of your settings ${n === 1 ? "differs" : "differ"} from `, file ?? "the text", "."];
}

export const groupSwitchLabel = (name: string) => `Import ${name}`;
export const tableCaption = (name: string) => `${name}: each setting now and after the import`;
export const TABLE_HEADERS = ["Setting", "Now", "After import"] as const;

/** The longest origin line shown; a longer one ends in "…". */
export const ORIGIN_MAX = 80;

/** The muted line under a new value saying where it came from in a
 *  MonkeyType file ("From Minimal"), or null when it would only repeat
 *  the value ("From Letter" under "Letter") or the row's own name
 *  ("From Background" on the Background row). Never longer than
 *  `ORIGIN_MAX` characters. */
export function originLine(item: { origin?: string; to: string; label: string }): string | null {
  if (!item.origin) return null;
  const said = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const origin = said(item.origin);
  if (origin === said(`From ${item.to}`) || origin === said(`From ${item.label}`)) return null;
  return item.origin.length > ORIGIN_MAX ? `${item.origin.slice(0, ORIGIN_MAX - 1).trimEnd()}…` : item.origin;
}
export const otherSettings = (n: number) => `${n} other ${n === 1 ? "setting" : "settings"}`;
export const matchesSummary = (n: number) =>
  `${settingsCount(n)} already ${n === 1 ? "matches" : "match"} yours`;
const where = (k: InputKind) => (k === "file" ? "file" : "text");

/** The muted line under the review's intro: how many of a MonkeyType
 *  file's settings flinttype uses. With the not-imported list and
 *  `restLine`, the review itself carries the file's whole tally. */
export function tallyLine(used: number, total: number, k: InputKind): string {
  if (total === 1) return `The one setting in the ${where(k)} has a match in flinttype.`;
  return `Of the ${total} settings in the ${where(k)}, flinttype uses ${used === total ? `all ${total}` : used}.`;
}

/** Under `tallyLine`, when the counts differ: how many of your settings
 *  the file's used ones cover, so the file's count links to yours (the
 *  intro's differences plus the settings that already match). */
export const bridgeLine = (used: number, yours: number): string | null =>
  used === yours ? null : `${coverPart(used, yours)}.`;

/** Closes the not-imported list: the file's settings neither used nor
 *  listed (at MonkeyType's defaults, saved only for MonkeyType's account,
 *  or doing nothing in the file, like a volume with clicks off), out of
 *  its `total`, so every setting in the file is accounted for. */
export const restLine = (n: number, total: number, k: InputKind) =>
  n === 1
    ? `One more of the ${total} settings in the ${where(k)} is at MonkeyType's default or changes nothing here.`
    : `The other ${n} of the ${total} settings in the ${where(k)} are at MonkeyType's defaults or change nothing here.`;

/** `n` counts settings. */
export const skippedSummary = (n: number, s: ImportSource) =>
  n === 0
    ? "Not imported"
    : s === "monkeytype"
      ? `${n} MonkeyType ${n === 1 ? "setting" : "settings"} not imported`
      : `${settingsCount(n)} not imported`;

export const REASON_HEADINGS: Record<SkipReason, string> = {
  "bad-value": "Values we couldn't use",
  "own-way": "flinttype does these its own way",
  "not-in-flinttype": "Not in flinttype",
  unrecognised: "Not recognised by this version of flinttype",
};

export const importButton = (n: number) => (n === 0 ? COPY.nothingToImport : `Import ${settingsCount(n)}`);
export const allMatchHeading = (k: InputKind) =>
  k === "file" ? "Your settings already match this file" : "Your settings already match this text";
