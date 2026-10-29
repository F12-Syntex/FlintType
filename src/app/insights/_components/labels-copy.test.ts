import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import * as labels from "./labels-copy";

describe("labels copy", () => {
  it("writes the generated lines", () => {
    expect(labels.deletedLine(1)).toBe("Deleted the analysis of 1 test.");
    expect(labels.deletedLine(1240)).toBe("Deleted the analysis of 1,240 tests.");
    expect(labels.deleteFailedLine("INTERNAL")).toBe("We couldn't delete your analysis. Error code: INTERNAL.");
    expect(labels.deleteFailedLine(null)).toMatch(/Check your connection/);
    expect(labels.scoringValue(12, 20)).toBe("12 of 20 words scored");
  });
  it("never shows an extra time that rounds to zero", () => {
    expect(labels.extraLabel(123)).toBe("+0.12 s");
    expect(labels.extraLabel(1400)).toBe("+1.4 s");
    expect(labels.extraLabel(5)).toBe("+0.01 s");
    for (const ms of [0, 0.4, 1, 2, 3, 4, 4.9]) expect(labels.extraLabel(ms), String(ms)).toBe("under 0.01 s");
  });
  it("claims no break threshold or fix mode for a single test", () => {
    for (const c of [labels.LAST_BREAK_CLAUSE, labels.LAST_FIXING_CLAUSE]) {
      expect(c).not.toMatch(/\d|second|backspace|back on track|move on/);
    }
  });
  it("passes the copy rules", () => {
    const sentences = [
      labels.PAIRS_CAPTION, labels.WORDS_NOTE, labels.WORDS_CAPTION, labels.PAIRS_LOCKED, labels.WORDS_LOCKED,
      labels.PAIRS_EMPTY, labels.WORDS_EMPTY, labels.DELETE_TITLE, labels.DELETE_BODY, labels.deletedLine(0),
      labels.deleteFailedLine("RATE_LIMITED"), labels.deleteFailedLine(null), labels.PICKER_TITLE,
      labels.LAST_BREAK_CLAUSE, labels.LAST_FIXING_CLAUSE,
    ];
    for (const s of sentences) expect(bannedPatterns(s), s).toEqual([]);
    const headings = [
      labels.PAIRS_TITLE, labels.PAIR_HEADER, labels.WORDS_TITLE, labels.WORD_HEADER, labels.EXTRA_HEADER,
      labels.MEASURED_HEADER, labels.PRACTISE_PAIRS, labels.PRACTISE_WORDS, labels.TECHNICAL_VIEW, labels.BROWSE_DRILLS,
      labels.DELETE_ANALYSIS, labels.DELETE_CONFIRM, labels.DELETING, labels.PICKER_LABEL, labels.TOUCH_LABEL,
      labels.COLUMN_LAST, labels.COLUMN_RECENT, labels.COLUMN_BETTER, labels.LOADING_LABEL, labels.SCORING_LABEL,
      labels.extraLabel(0), labels.extraLabel(120), ...labels.MINUTE_TICKS,
    ];
    for (const h of headings) expect(bannedPatterns(h, { heading: true }), h).toEqual([]);
  });
});
