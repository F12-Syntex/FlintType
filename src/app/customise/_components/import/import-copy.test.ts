import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import type { ImportFailureKind, ImportSource } from "@/types/settings-import";
import {
  announceIdentify, announceMatch, checkHeading, chooseIntro, COPY, dialogTitle, doneHeading, failHeading, failureCopy,
  identifyDetail, matchDetail, matchDetails, readDetail, stepLabels, type InputKind,
} from "./import-copy";

const SOURCES: ImportSource[] = ["monkeytype", "flinttype"];
const KINDS: InputKind[] = ["file", "text"];
const FAILURES: ImportFailureKind[] = [
  "too-large", "empty", "unreadable", "not-json", "other-app", "not-settings", "newer-version", "nothing-usable",
  "account-unavailable",
];

/** Sentences end with a full stop; headings, labels and buttons don't. */
const SENTENCES = new Set<string>([
  COPY.reviewHint, COPY.allMatchLine, COPY.groupFailed, COPY.stoppedLine, COPY.doneLine, COPY.undoneLine,
  COPY.ownerStoppedLine, COPY.ownerLostLine, COPY.ownerUnsureLine, COPY.recheckingLine, COPY.recheckedLine, COPY.undoLostLine,
]);

describe("import copy", () => {
  it("passes the copy rules", () => {
    const headings: string[] = Object.values(COPY).filter((s) => !SENTENCES.has(s));
    const sentences: string[] = [...SENTENCES];
    for (const s of SOURCES) {
      headings.push(dialogTitle(s), doneHeading(1, s), doneHeading(17, s), matchDetail(s, 31));
      headings.push(...matchDetails(s, 1, 18), ...matchDetails(s, 40, 56));
      sentences.push(...chooseIntro(s), announceMatch(s, 40, 56), announceMatch(s, 1, 1));
      for (const k of KINDS) {
        headings.push(checkHeading(k), failHeading(k), ...stepLabels(s, k), identifyDetail(s, k, 94), ...readDetail({ kind: k, name: "x.json", bytes: 2048 }));
        for (const kind of FAILURES) sentences.push(...failureCopy({ kind, step: 1, size: 3_355_443 }, s, k));
      }
    }
    for (const h of headings) expect([h, bannedPatterns(h, { heading: true })]).toEqual([h, []]);
    for (const t of sentences) expect([t, bannedPatterns(t)]).toEqual([t, []]);
  });

  it("counts in the singular and the plural", () => {
    expect(doneHeading(1, "monkeytype")).toBe("Imported 1 setting from MonkeyType");
    expect(doneHeading(17, "monkeytype")).toBe("Imported 17 settings from MonkeyType");
  });

  it("never calls pasted text a file when it can't be used", () => {
    for (const s of SOURCES) {
      for (const kind of FAILURES) {
        const copy = failureCopy({ kind, step: 1, size: 3_355_443, otherApp: s === "monkeytype" ? "flinttype" : "monkeytype" }, s, "text");
        // ("the text of your exported file" names the export, not the paste)
        expect([kind, /\bthis file\b|settings file\b/i.test(copy.join(" "))]).toEqual([kind, false]);
      }
    }
    expect(failureCopy({ kind: "other-app", step: 2, otherApp: "monkeytype" }, "flinttype", "text")).toEqual([
      "These are MonkeyType settings.", "You can import them as MonkeyType settings instead.",
    ]);
    expect(failureCopy({ kind: "newer-version", step: 2 }, "flinttype", "text")[0]).toBe(
      "This text comes from a newer version of flinttype.",
    );
    expect(failureCopy({ kind: "other-app", step: 2, otherApp: "monkeytype" }, "flinttype", "file")[0]).toBe(
      "This is a MonkeyType settings file.",
    );
  });

  it("calls pasted settings text, never a file", () => {
    expect(stepLabels("monkeytype", "file")[1]).toBe("Checking it's a MonkeyType settings file");
    expect(stepLabels("monkeytype", "text")[1]).toBe("Checking these are MonkeyType settings");
    expect(stepLabels("flinttype", "text")[1]).toBe("Checking these are flinttype settings");
    expect(announceIdentify("monkeytype", "file")).toBe("This is a MonkeyType settings file.");
    expect(announceIdentify("monkeytype", "text")).toBe("These are MonkeyType settings.");
    expect(announceIdentify("flinttype", "text")).toBe("These are flinttype settings.");
    for (const k of KINDS) for (const s of SOURCES) expect(bannedPatterns(announceIdentify(s, k))).toEqual([]);
  });

  it("bridges the file's settings to yours when one covers several, never as if already set", () => {
    expect(matchDetails("monkeytype", 40, 56)).toEqual(["Found 40 settings flinttype can use", "They cover 56 of your settings"]);
    expect(matchDetails("monkeytype", 1, 18)).toEqual(["Found 1 setting flinttype can use", "It covers 18 of your settings"]);
    expect(matchDetails("monkeytype", 3, 1)).toEqual(["Found 3 settings flinttype can use", "They cover 1 of your settings"]);
    expect(matchDetails("monkeytype", 12, 12)).toEqual(["Found 12 settings flinttype can use"]);
    // A flinttype file counts your settings already.
    expect(matchDetails("flinttype", 12, 12)).toEqual(["Found 12 settings"]);
    expect(announceMatch("monkeytype", 40, 56)).toBe("Found 40 settings flinttype can use. They cover 56 of your settings.");
    expect(announceMatch("monkeytype", 12, 12)).toBe("Found 12 settings flinttype can use.");
  });

  it("names the export date in full", () => {
    expect(identifyDetail("flinttype", "file", 3, "2026-10-12T12:00:00.000Z")).toBe("Exported on 12 October 2026");
    expect(identifyDetail("monkeytype", "text", 94)).toBe("94 settings in the text");
  });

  it("offers the other import for a file from the other app", () => {
    expect(failureCopy({ kind: "other-app", step: 2, otherApp: "flinttype" }, "monkeytype", "file")).toEqual([
      "This is a flinttype settings file.",
      "You can import it as flinttype settings instead.",
    ]);
    expect(failureCopy({ kind: "too-large", step: 1, size: 3_355_443 }, "monkeytype", "file")[1]).toBe(
      "Settings files are well under 1 MB. This one is 3.2 MB.",
    );
  });
});
