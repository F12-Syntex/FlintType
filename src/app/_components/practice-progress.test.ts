import { describe, expect, it } from "vitest";
import { liveSnapshotWindow, practiceProgressChars } from "./practice-progress";

describe("practiceProgressChars", () => {
  const words = ["the", "quick", "brown"]; // "the quick brown" = 15 chars

  it("is 0 at the start", () => {
    expect(practiceProgressChars({ words, cursorWord: 0, cursorChar: 0 })).toBe(0);
  });

  it("counts completed words plus their trailing space, then the active char", () => {
    // finished "the", caret at the start of "quick" → "the " = 4
    expect(practiceProgressChars({ words, cursorWord: 1, cursorChar: 0 })).toBe(4);
    // finished "the quick", two chars into "brown" → "the quick br" = 12
    expect(practiceProgressChars({ words, cursorWord: 2, cursorChar: 2 })).toBe(12);
  });

  it("clamps past-the-end (extras / done) to the passage length", () => {
    expect(practiceProgressChars({ words, cursorWord: 3, cursorChar: 0 })).toBe(15);
    expect(practiceProgressChars({ words, cursorWord: 2, cursorChar: 99 })).toBe(15);
  });

  it("is 0 for an empty passage", () => {
    expect(practiceProgressChars({ words: [], cursorWord: 0, cursorChar: 0 })).toBe(0);
  });
});

describe("liveSnapshotWindow", () => {
  it("passes a bounded passage through whole", () => {
    const words = ["the", "quick", "brown"];
    const out = liveSnapshotWindow({ words, cursorWord: 1, cursorChar: 0 }, 300);
    expect(out.words).toEqual(words);
    expect(out.totalChars).toBe(15);
    expect(out.progressChars).toBe(4);
  });

  it("windows an over-cap passage to maxWords around the caret, re-basing the cursor", () => {
    // 600 words "w0".."w599", caret deep in the run (TIME-mode runaway).
    const words = Array.from({ length: 600 }, (_, i) => `w${i}`);
    const out = liveSnapshotWindow(
      { words, cursorWord: 400, cursorChar: 1 },
      300,
    );
    expect(out.words.length).toBe(300);
    // The caret's word must be inside the window.
    const lead = Math.floor(300 * 0.7); // 210
    const start = 400 - lead; // 190
    expect(out.words[0]).toBe(`w${start}`);
    expect(out.words[lead]).toBe("w400");
    // progressChars is re-based into the window and within its total.
    expect(out.progressChars).toBeGreaterThan(0);
    expect(out.progressChars).toBeLessThanOrEqual(out.totalChars);
    expect(out.totalChars).toBe(out.words.join(" ").length);
  });

  it("clamps the window to the end when the caret is near the tail", () => {
    const words = Array.from({ length: 600 }, (_, i) => `w${i}`);
    const out = liveSnapshotWindow(
      { words, cursorWord: 599, cursorChar: 0 },
      300,
    );
    expect(out.words.length).toBe(300);
    expect(out.words[out.words.length - 1]).toBe("w599");
    expect(out.words[0]).toBe("w300");
  });
});
