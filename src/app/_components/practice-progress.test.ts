import { describe, expect, it } from "vitest";
import { practiceProgressChars } from "./practice-progress";

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
