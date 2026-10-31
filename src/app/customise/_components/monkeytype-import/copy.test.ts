import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import {
  ERROR_COPY,
  SAVED_SIGNED_OUT,
  doneTitle,
  importLabel,
  leftOutLines,
  reviewLead,
  savedLine,
} from "./copy";
import type { MtPlan } from "./types";

const plan = (p: Partial<MtPlan>): MtPlan => ({
  groups: [],
  changes: 12,
  alreadyMatch: 0,
  unmatched: 0,
  leavesLook: false,
  ...p,
});

describe("import copy", () => {
  it("counts what changes and what already matches", () => {
    expect(reviewLead(plan({}))).toBe("12 settings will change.");
    expect(reviewLead(plan({ changes: 1, alreadyMatch: 1 }))).toBe(
      "1 setting will change, and 1 already matches.",
    );
    expect(reviewLead(plan({ alreadyMatch: 4 }))).toBe("12 settings will change, and 4 already match.");
  });

  it("says what stays out", () => {
    expect(leftOutLines(plan({}))).toEqual([]);
    expect(leftOutLines(plan({ leavesLook: true, unmatched: 1 }))).toEqual([
      "Your theme colours and font stay as they are.",
      "1 other MonkeyType setting has no match in flinttype.",
    ]);
  });

  it("names the count on the button and the done screen", () => {
    expect(importLabel(plan({ changes: 1 }))).toBe("Import 1 setting");
    expect(doneTitle(plan({}))).toBe("Imported 12 settings");
  });

  it("follows the copy rules", () => {
    const sentences = [
      reviewLead(plan({ alreadyMatch: 2 })),
      ...leftOutLines(plan({ leavesLook: true, unmatched: 9 })),
      savedLine(true),
      savedLine(false),
      SAVED_SIGNED_OUT.lead,
      `${SAVED_SIGNED_OUT.link} ${SAVED_SIGNED_OUT.rest}`,
      ...Object.values(ERROR_COPY).map((c) => c.text),
    ];
    for (const s of sentences) expect(bannedPatterns(s), s).toEqual([]);
    const headings = [importLabel(plan({})), doneTitle(plan({})), ...Object.values(ERROR_COPY).map((c) => c.title)];
    for (const h of headings) expect(bannedPatterns(h, { heading: true }), h).toEqual([]);
  });
});
