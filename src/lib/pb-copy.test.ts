import { describe, expect, it } from "vitest";
import { bannedPatterns } from "./copy-rules";
import {
  accuracyText,
  friendPbSentence,
  pbDelta,
  pbSentence,
  withArticle,
  type PbCopyInput,
} from "./pb-copy";

function pb(over: Partial<PbCopyInput> = {}): PbCopyInput {
  return { mode: "casual", durationOrWordCount: 60, lengthMode: "time", wpm: 102, accuracy: 98, ...over };
}

describe("pbSentence", () => {
  it("states speed, accuracy and the kind of test", () => {
    expect(pbSentence(pb())).toBe("102 wpm at 98% accuracy in a Casual test of 60 seconds.");
  });

  it("names every mode as the app does", () => {
    expect(pbSentence(pb({ mode: "training", lengthMode: "words", durationOrWordCount: 25 }))).toBe(
      "102 wpm at 98% accuracy in an Adapt test of 25 words.",
    );
    expect(pbSentence(pb({ mode: "race", lengthMode: "words", durationOrWordCount: 25 }))).toBe(
      "102 wpm at 98% accuracy in a race of 25 words.",
    );
    expect(pbSentence(pb({ mode: "reverse_adaptive", lengthMode: "words", durationOrWordCount: 50 }))).toBe(
      "102 wpm at 98% accuracy in a Reverse test of 50 words.",
    );
  });

  it("covers every length mode, never saying thicc", () => {
    expect(pbSentence(pb({ lengthMode: "words", durationOrWordCount: 50 }))).toContain("a Casual test of 50 words.");
    expect(pbSentence(pb({ lengthMode: "time", durationOrWordCount: 15 }))).toContain("a Casual test of 15 seconds.");
    expect(pbSentence(pb({ lengthMode: "quote", durationOrWordCount: 2 }))).toContain(
      "a Casual test with a long quote.",
    );
    const extra = pbSentence(pb({ lengthMode: "quote", durationOrWordCount: 3 }));
    expect(extra).toContain("a Casual test with an extra-long quote.");
    expect(extra).not.toMatch(/thicc/i);
  });

  it("guesses the unit when lengthMode is missing (old rows)", () => {
    expect(pbSentence(pb({ lengthMode: null, durationOrWordCount: 60 }))).toContain("60 seconds");
    expect(pbSentence(pb({ lengthMode: undefined, durationOrWordCount: 25 }))).toContain("25 words");
  });

  it("uses singular lengths", () => {
    expect(pbSentence(pb({ lengthMode: "words", durationOrWordCount: 1 }))).toContain("of 1 word.");
    expect(pbSentence(pb({ lengthMode: "time", durationOrWordCount: 1 }))).toContain("of 1 second.");
  });

  it("rounds the speed and keeps the reader's unit out of it", () => {
    expect(pbSentence(pb({ wpm: 160.4 }))).toMatch(/^160 wpm at /);
  });
});

describe("friendPbSentence", () => {
  it("names the friend and the test", () => {
    expect(friendPbSentence("Mara", pb({ mode: "training", lengthMode: "words", durationOrWordCount: 25, wpm: 188 }))).toBe(
      "Mara hit 188 wpm in an Adapt test of 25 words.",
    );
    expect(friendPbSentence("@ace", pb({ mode: "race", lengthMode: "words", durationOrWordCount: 25 }))).toBe(
      "@ace hit 102 wpm in a race of 25 words.",
    );
  });
});

describe("withArticle", () => {
  it("uses an before a vowel, either case", () => {
    expect(withArticle("Adapt test of 25 words")).toBe("an Adapt test of 25 words");
    expect(withArticle("Easy one")).toBe("an Easy one");
    expect(withArticle("extra-long quote")).toBe("an extra-long quote");
    expect(withArticle("Casual test of 60 seconds")).toBe("a Casual test of 60 seconds");
    expect(withArticle("race of 25 words")).toBe("a race of 25 words");
  });
});

describe("accuracyText", () => {
  it("drops a trailing .0 and keeps one decimal otherwise", () => {
    expect(accuracyText(98.0)).toBe("98%");
    expect(accuracyText(97.55)).toBe("97.6%");
    expect(accuracyText(97.5)).toBe("97.5%");
    expect(accuracyText(100)).toBe("100%");
    expect(accuracyText(Number.NaN)).toBe("0%");
  });
});

describe("pbDelta", () => {
  it("derives the gain from the rounded figures, so it reconciles (#12)", () => {
    // 160.4 shows as 160 and 155.6 as 156: the gain reads 4, never 5.
    expect(pbDelta(160.4, 155.6)).toBe(4);
    for (const [w, p] of [[99.5, 90.4], [203.9, 199.1]] as const) {
      expect(pbDelta(w, p)).toBe(Math.round(w) - Math.round(p));
    }
    expect(pbDelta(90, 92)).toBe(-2);
  });
});

describe("copy rules", () => {
  it("every sentence passes bannedPatterns", () => {
    const samples: PbCopyInput[] = [
      pb(),
      pb({ mode: "training", lengthMode: "words", durationOrWordCount: 25 }),
      pb({ mode: "race", lengthMode: "words", durationOrWordCount: 40, accuracy: 97.55 }),
      pb({ lengthMode: "quote", durationOrWordCount: 9 }),
      pb({ lengthMode: null, durationOrWordCount: 1_000 }),
    ];
    for (const s of samples) {
      expect(bannedPatterns(pbSentence(s))).toEqual([]);
      expect(bannedPatterns(friendPbSentence("Mara", s))).toEqual([]);
    }
  });
});
