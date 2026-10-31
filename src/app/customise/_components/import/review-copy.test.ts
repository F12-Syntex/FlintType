import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import type { ImportSource } from "@/types/settings-import";
import type { InputKind } from "./import-copy";
import {
  allMatchHeading, bridgeLine, importButton, matchesSummary, ORIGIN_MAX, originLine, otherSettings, REASON_HEADINGS,
  restLine, reviewIntro, skippedSummary, TABLE_HEADERS, tableCaption, tallyLine,
} from "./review-copy";

const SOURCES: ImportSource[] = ["monkeytype", "flinttype"];
const KINDS: InputKind[] = ["file", "text"];

describe("review copy", () => {
  it("passes the copy rules", () => {
    const headings: string[] = [...Object.values(REASON_HEADINGS), tableCaption("Colours"), ...TABLE_HEADERS];
    headings.push(importButton(0), importButton(1), importButton(17), matchesSummary(1), matchesSummary(10), otherSettings(2));
    for (const s of SOURCES) headings.push(skippedSummary(0, s), skippedSummary(3, s));
    const sentences: string[] = [reviewIntro(21, "sample-settings.json").join(""), reviewIntro(1, null).join("")];
    sentences.push(bridgeLine(40, 56)!, bridgeLine(1, 18)!, bridgeLine(2, 1)!);
    for (const k of KINDS) {
      headings.push(allMatchHeading(k));
      sentences.push(restLine(1, 94, k), restLine(47, 94, k), tallyLine(40, 94, k), tallyLine(5, 5, k), tallyLine(1, 1, k));
    }
    for (const h of headings) expect([h, bannedPatterns(h, { heading: true })]).toEqual([h, []]);
    for (const t of sentences) {
      expect([t, bannedPatterns(t)]).toEqual([t, []]);
      expect([t, t.split(" ").length <= 20]).toEqual([t, true]);
    }
  });

  it("counts in the singular and the plural", () => {
    expect(importButton(1)).toBe("Import 1 setting");
    expect(importButton(17)).toBe("Import 17 settings");
    expect(importButton(0)).toBe("Nothing to import");
    expect(reviewIntro(1, null).join("")).toBe("1 of your settings differs from the text.");
    expect(reviewIntro(32, "sample-settings.json").join("")).toBe("32 of your settings differ from sample-settings.json.");
    expect([skippedSummary(0, "monkeytype"), skippedSummary(7, "monkeytype")]).toEqual(["Not imported", "7 MonkeyType settings not imported"]);
    expect(matchesSummary(1)).toBe("1 setting already matches yours");
  });

  it("states a MonkeyType file's whole tally, in the file's own words", () => {
    // 40 used + 7 listed + 47 others = 94, all on the Review.
    expect(tallyLine(40, 94, "file")).toBe("Of the 94 settings in the file, flinttype uses 40.");
    expect(tallyLine(40, 94, "text")).toBe("Of the 94 settings in the text, flinttype uses 40.");
    expect(restLine(47, 94, "text")).toBe("The other 47 of the 94 settings in the text are at MonkeyType's defaults or change nothing here.");
    expect(restLine(1, 94, "file")).toBe("One more of the 94 settings in the file is at MonkeyType's default or changes nothing here.");
    expect(tallyLine(12, 12, "file")).toBe("Of the 12 settings in the file, flinttype uses all 12.");
    expect(tallyLine(1, 1, "text")).toBe("The one setting in the text has a match in flinttype.");
  });

  it("links the file's count to yours only when they differ", () => {
    // 40 of the file's settings cover 56 of yours: 32 differ + 24 match.
    expect(bridgeLine(40, 56)).toBe("They cover 56 of your settings.");
    expect(bridgeLine(1, 18)).toBe("It covers 18 of your settings.");
    expect(bridgeLine(12, 12)).toBeNull();
  });

  it("shows where a MonkeyType value came from only when it adds something", () => {
    expect(originLine({ origin: "From Minimal", to: "On", label: "Letters only" })).toBe("From Minimal");
    expect(originLine({ origin: "From size 3", to: "48px", label: "Size" })).toBe("From size 3");
    expect(originLine({ origin: "From Letter", to: "Letter", label: "Highlight" })).toBeNull();
    expect(originLine({ origin: "From 15 seconds", to: "15 seconds", label: "Length" })).toBeNull();
    expect(originLine({ to: "Line", label: "Style" })).toBeNull();
  });

  it("never repeats the row's own name as where a value came from", () => {
    expect(originLine({ origin: "From Background", to: "#132237", label: "Background" })).toBeNull();
    expect(originLine({ origin: "From  text", to: "#1cbaac", label: "Text" })).toBeNull();
    expect(originLine({ origin: "From Main", to: "#ebb723", label: "Accent" })).toBe("From Main");
    expect(originLine({ origin: "With Show all lines off", to: "3", label: "Lines shown" })).toBe("With Show all lines off");
  });

  it("caps a long origin line", () => {
    const line = originLine({ origin: `From ${"Long, ".repeat(40)}`, to: "Long", label: "Length" })!;
    expect(line.length).toBeLessThanOrEqual(ORIGIN_MAX);
    expect(line.endsWith("…")).toBe(true);
  });
});
