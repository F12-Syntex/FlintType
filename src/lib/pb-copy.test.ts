import { describe, expect, it } from "vitest";
import { bannedPatterns } from "./copy-rules";
import {
  accuracyText,
  friendPbSentence,
  legacyLengthMode,
  pbDelta,
  pbSentence,
  withArticle,
  withLegacyLengthMode,
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

describe("legacyLengthMode", () => {
  it("reads the unit from both old PB body shapes", () => {
    expect(legacyLengthMode("Casual · 45s · 100 wpm · 98.0% acc", 45)).toBe("time");
    expect(legacyLengthMode("Casual 45s · 100 wpm · 98.0% acc (previous best 92)", 45)).toBe("time");
    expect(legacyLengthMode("Casual · 30 words · 100 wpm · 98.0% acc (previous best 92 · +8)", 30)).toBe("words");
    expect(legacyLengthMode("Adapt · 1 word · 100 wpm · 100.0% acc", 1)).toBe("words");
  });

  it("reads the unit from old friend PB bodies", () => {
    expect(legacyLengthMode("Mara hit 100 wpm on 90s.", 90)).toBe("time");
    expect(legacyLengthMode("Mara hit 100 wpm on 30 words.", 30)).toBe("words");
  });

  it("reads a friend body's unit from its tail, never from the name", () => {
    expect(legacyLengthMode("Agent 7s hit 188 wpm on 7 words.", 7)).toBe("words");
    expect(legacyLengthMode("Agent 45s hit 100 wpm on 45 words.", 45)).toBe("words");
    expect(legacyLengthMode("Agent 7 words hit 188 wpm on 7s.", 7)).toBe("time");
    expect(legacyLengthMode("Odd hit 3 wpm on 9s hit 188 wpm on 9s.", 9)).toBe("time");
    // A bare-number friend body names no unit, even when the name does.
    expect(legacyLengthMode("Agent 7s hit 188 wpm on 7.", 7)).toBeNull();
  });

  it("only matches the row's own amount, and gives up on a bare number", () => {
    // "100 wpm" and "98.0%" never count as a unit for 45.
    expect(legacyLengthMode("Casual · 45s · 100 wpm · 98.0% acc", 100)).toBeNull();
    expect(legacyLengthMode("Casual · 145s · 100 wpm", 45)).toBeNull();
    // The oldest rows wrote "Casual 60 · …" with no unit.
    expect(legacyLengthMode("Casual 60 · 102 wpm · 98.0% acc", 60)).toBeNull();
    expect(legacyLengthMode("", 60)).toBeNull();
    expect(legacyLengthMode("Casual · 45s ·", Number.NaN)).toBeNull();
  });
});

describe("withLegacyLengthMode", () => {
  const old = { mode: "casual", wpm: 100, accuracy: 98 };

  it("keeps a custom length's real unit on an old row", () => {
    const time = withLegacyLengthMode({ ...old, durationOrWordCount: 45 }, "Casual · 45s · 100 wpm · 98.0% acc");
    expect(pbSentence(time)).toBe("100 wpm at 98% accuracy in a Casual test of 45 seconds.");
    const words = withLegacyLengthMode({ ...old, durationOrWordCount: 30 }, "Casual · 30 words · 100 wpm · 98.0% acc");
    expect(pbSentence(words)).toBe("100 wpm at 98% accuracy in a Casual test of 30 words.");
    const friend = withLegacyLengthMode({ ...old, durationOrWordCount: 90 }, "Mara hit 100 wpm on 90s.");
    expect(friendPbSentence("Mara", friend)).toBe("Mara hit 100 wpm in a Casual test of 90 seconds.");
  });

  it("leaves rows that store their unit alone, null included", () => {
    const stored = { ...old, durationOrWordCount: 30, lengthMode: "time" as const };
    expect(withLegacyLengthMode(stored, "Casual · 30 words ·")).toBe(stored);
    const legacyRun = { ...old, durationOrWordCount: 60, lengthMode: null };
    expect(withLegacyLengthMode(legacyRun, "60 words")).toBe(legacyRun);
  });

  it("falls back to the guess when the body names no unit", () => {
    const data = withLegacyLengthMode<PbCopyInput>({ ...old, durationOrWordCount: 60 }, "Casual 60 · 102 wpm");
    expect(data.lengthMode).toBeNull();
    expect(pbSentence(data)).toContain("60 seconds");
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
