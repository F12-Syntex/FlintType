import { formatBytes } from "@/lib/settings-import/read";
import type { ImportFailure, ImportSource } from "@/types/settings-import";

/** The settings import dialog's strings, apart from the Review screen's
 *  (`review-copy.ts`). Plain sentence case, UK spelling, one idea per
 *  sentence (ui-law §27 rule 6); the test runs each one through
 *  `bannedPatterns`. Pure. */

export type InputKind = "file" | "text";

export const sourceName = (s: ImportSource) => (s === "monkeytype" ? "MonkeyType" : "flinttype");
export const settingsCount = (n: number) => `${n} ${n === 1 ? "setting" : "settings"}`;

export const dialogTitle = (s: ImportSource) => `Import ${sourceName(s)} settings`;

export const chooseIntro = (s: ImportSource): [string, string] =>
  s === "monkeytype"
    ? ["In MonkeyType, export your settings from the bottom of the Settings page.", "Paste them here, or choose the file you saved."]
    : ["Choose a file you exported from flinttype.", "You can also paste its text here."];

export const pasteLabel = (s: ImportSource) => `${sourceName(s)} settings text`;
export const COPY = {
  pastePlaceholder: "Paste your settings here",
  chooseFile: "Choose a file",
  dropHint: "or drop it here",
  dropOverlay: "Drop the file to check it",
  cancel: "Cancel",
  tryAgain: "Try again",
  check: "Check settings",
  checking: "Checking…",
  chooseAnother: "Choose another file",
  editText: "Edit the text",
  importInstead: "Import it instead",
  reviewHeading: "Choose what to import",
  reviewHint: "Turn off any group you want to keep as it is.",
  nothingToImport: "Nothing to import",
  allMatchLine: "There's nothing to import.",
  done: "Done",
  importing: "Importing…",
  importingHeading: "Importing your settings",
  groupFailed: "This group couldn't be imported.",
  stoppedHeading: "Import stopped",
  stoppedLine: "We put back everything this import changed, so your settings are as they were.",
  ownerStoppedLine: "You signed in or out during the import, so it stopped.",
  /** No save goes out mid-import, so a sign-out or switch dropped it all. */
  ownerLostLine: "Nothing from it was saved.",
  ownerUnsureLine: "We couldn't confirm it was saved.",
  recheckingLine: "You signed in or out, so we're checking your settings again.",
  recheckedLine: "You signed in or out, so we checked your settings again.",
  undoLostLine: "You signed in or out, so this import can't be undone.",
  close: "Close",
  doneLine: "Everything else stayed as it was.",
  undo: "Undo",
  undoneHeading: "Import undone",
  undoneLine: "Your settings are back as they were.",
} as const;

export const checkHeading = (k: InputKind) => (k === "file" ? "Checking your file" : "Checking your settings");
export const failHeading = (k: InputKind) => (k === "file" ? "We couldn't use this file" : "We couldn't use this text");

export const stepLabels = (s: ImportSource, k: InputKind): [string, string, string] => [
  k === "file" ? "Reading the file" : "Reading the text",
  k === "file" ? `Checking it's a ${sourceName(s)} settings file` : `Checking these are ${sourceName(s)} settings`,
  "Matching your settings",
];

export const readDetail = (input: { kind: InputKind; name?: string; bytes: number }): string[] =>
  input.kind === "file" ? [input.name ?? "File", formatBytes(input.bytes)] : [`${formatBytes(input.bytes)} of text`];

const DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

export function identifyDetail(s: ImportSource, k: InputKind, settings: number, exportedAt?: string): string {
  if (s === "flinttype" && exportedAt) return `Exported on ${DATE.format(new Date(exportedAt))}`;
  return `${settingsCount(settings)} in the ${k === "file" ? "file" : "text"}`;
}

export const matchDetail = (s: ImportSource, n: number) =>
  s === "monkeytype" ? `Found ${settingsCount(n)} flinttype can use` : `Found ${settingsCount(n)}`;
/** The match step's detail parts. One MonkeyType setting can cover
 *  several of yours (a custom theme covers every colour), so when `yours`
 *  (what the review counts) differs from `found`, a second part bridges
 *  the two. Both are sentences, so the step shows them on their own lines. */
export function matchDetails(s: ImportSource, found: number, yours: number): string[] {
  if (s !== "monkeytype" || yours === found) return [matchDetail(s, found)];
  return [matchDetail(s, found), coverPart(found, yours)];
}

/** How many of your settings `found` of a file's settings cover. */
export const coverPart = (found: number, yours: number) =>
  `${found === 1 ? "It covers" : "They cover"} ${yours} of your settings`;

export const announceRead = (k: InputKind, name?: string) => (k === "file" ? `Read ${name ?? "the file"}.` : "Read the text.");
export const announceIdentify = (s: ImportSource, k: InputKind) =>
  k === "file" ? `This is a ${sourceName(s)} settings file.` : `These are ${sourceName(s)} settings.`;
export const announceMatch = (s: ImportSource, found: number, yours: number) =>
  `${matchDetails(s, found, yours).join(". ")}.`;

/** The problem, then what to do about it. */
export function failureCopy(f: ImportFailure, s: ImportSource, k: InputKind): [string, string] {
  const name = sourceName(s);
  const size = formatBytes(f.size ?? 0);
  switch (f.kind) {
    case "too-large":
      return k === "file"
        ? ["This file is too big to be a settings file.", `Settings files are well under 1 MB. This one is ${size}.`]
        : ["This text is too long to be settings.", `Settings are well under 1 MB of text. This is ${size}.`];
    case "empty":
      return k === "file"
        ? ["This file is empty.", "Export your settings again, then choose the new file."]
        : ["There's no text to check.", "Paste your settings, then try again."];
    case "unreadable":
      return k === "file"
        ? ["We couldn't read this file.", "Save it again, then choose it here."]
        : ["We couldn't read this text.", "Copy it again, then paste it here."];
    case "not-json":
      if (k === "text") {
        return s === "monkeytype"
          ? ["This text isn't JSON.", "Copy your settings from MonkeyType again, then paste them here."]
          : ["This text isn't JSON.", "Copy the text of your exported file again, then paste it here."];
      }
      return s === "monkeytype"
        ? ["This file isn't JSON.", "MonkeyType exports settings as JSON, so this is probably a different file."]
        : ["This file isn't JSON.", "Settings exported from flinttype are JSON, so this is probably a different file."];
    case "other-app": {
      const other = sourceName(f.otherApp ?? (s === "monkeytype" ? "flinttype" : "monkeytype"));
      return k === "file"
        ? [`This is a ${other} settings file.`, `You can import it as ${other} settings instead.`]
        : [`These are ${other} settings.`, `You can import them as ${other} settings instead.`];
    }
    case "not-settings":
      return [
        k === "file" ? `This doesn't look like a ${name} settings file.` : `This text doesn't look like ${name} settings.`,
        s === "monkeytype" ? "It has none of the settings MonkeyType exports." : "It's missing the details every flinttype export has.",
      ];
    case "newer-version":
      return [
        `This ${k === "file" ? "file" : "text"} comes from a newer version of flinttype.`,
        "Reload this page to get the newest version, then try again.",
      ];
    case "nothing-usable":
      return [
        s === "monkeytype"
          ? "None of these settings have a match in flinttype."
          : `This ${k === "file" ? "file" : "text"} has no settings we recognise.`,
        "Nothing was changed.",
      ];
    case "account-unavailable":
      return ["We couldn't load your account's settings.", "Check your connection, then try again."];
  }
}

export const doneHeading = (n: number, s: ImportSource) => `Imported ${settingsCount(n)} from ${sourceName(s)}`;
