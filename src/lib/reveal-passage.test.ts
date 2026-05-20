import { describe, expect, it } from "vitest";
import { revealAt } from "./reveal-passage";

const words = ["the", "quick", "brown"]; // "the quick brown" = 15 chars
const typed = ["the", "quick", "brown"];

describe("revealAt", () => {
  it("reveals nothing at 0", () => {
    expect(revealAt(words, typed, 0)).toEqual({
      cursorWord: 0,
      cursorChar: 0,
      typed: ["", "", ""],
    });
  });

  it("reveals completed words fully and the caret word partially", () => {
    // "the quick br" = 12 → caret 2 chars into "brown"
    expect(revealAt(words, typed, 12)).toEqual({
      cursorWord: 2,
      cursorChar: 2,
      typed: ["the", "quick", "br"],
    });
  });

  it("reveals a finished word + sits at the start of the next after the space", () => {
    // "the " = 4 → start of "quick"
    expect(revealAt(words, typed, 4)).toEqual({
      cursorWord: 1,
      cursorChar: 0,
      typed: ["the", "", ""],
    });
  });

  it("reveals everything at/over the end", () => {
    expect(revealAt(words, typed, 15)).toEqual({
      cursorWord: 2,
      cursorChar: 5,
      typed: ["the", "quick", "brown"],
    });
    expect(revealAt(words, typed, 999).typed).toEqual(["the", "quick", "brown"]);
  });

  it("shows the actual typed text (including a mistype), not the target", () => {
    // they typed "thx" for "the"; revealed past it → show "thx"
    expect(revealAt(words, ["thx", "quick", "brown"], 12).typed).toEqual([
      "thx",
      "quick",
      "br",
    ]);
  });
});
