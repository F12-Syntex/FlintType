import { describe, expect, it } from "vitest";
import { digestContext, fixModeOf, inputKindOf, isQwertyKeyboard, isShifted } from "./context";

const ev = (src?: "input") => ({ t: 0, expected: "a", typed: "a", correct: true, wordIndex: 0, ...(src ? { src } : {}) });

describe("fixModeOf", () => {
  it("covers every branch, stop on error winning over backspace off", () => {
    expect(fixModeOf(undefined)).toBe("fix");
    expect(fixModeOf({})).toBe("fix");
    expect(fixModeOf({ confidence: "word" })).toBe("fix");
    expect(fixModeOf({ confidence: "all" })).toBe("none");
    expect(fixModeOf({ stopOnError: true })).toBe("block");
    expect(fixModeOf({ suddenDeath: true })).toBe("block");
    expect(fixModeOf({ stopOnError: true, confidence: "all" })).toBe("block");
  });
});

describe("input kind and QWERTY", () => {
  it("inputKindOf gives keyboard, touch and mixed", () => {
    expect(inputKindOf([ev(), ev()])).toBe("keyboard");
    expect(inputKindOf([ev("input"), ev("input")])).toBe("touch");
    expect(inputKindOf([ev("input"), ev()])).toBe("mixed");
  });

  it("isQwertyKeyboard reads codeMatch only, on a keyboard", () => {
    expect(isQwertyKeyboard({ codeMatch: 0.97 }, "keyboard")).toBe(true);
    expect(isQwertyKeyboard({ codeMatch: 0.95 }, "keyboard")).toBe(true);
    expect(isQwertyKeyboard({ codeMatch: 0.6 }, "keyboard")).toBe(false);
    expect(isQwertyKeyboard({ codeMatch: 1 }, "touch")).toBe(false);
    expect(isQwertyKeyboard({ codeMatch: 1 }, "mixed")).toBe(false);
    expect(isQwertyKeyboard({}, "keyboard")).toBe(false);
    expect(isQwertyKeyboard(undefined, "keyboard")).toBe(false);
  });

  it("isShifted for capitals and shifted symbols", () => {
    expect(isShifted("A")).toBe(true);
    expect(isShifted("?")).toBe(true);
    expect(isShifted('"')).toBe(true);
    expect(isShifted("a")).toBe(false);
    expect(isShifted(",")).toBe(false);
    expect(isShifted("")).toBe(false);
  });
});

describe("digestContext", () => {
  it("defaults booleans to false and the rest to null", () => {
    expect(digestContext(undefined, "keyboard", true, false)).toEqual({
      input: "keyboard", layout: "plain", std: true, wordlist: null, fixMode: "fix",
      suddenDeath: false, drill: false, race: false, punctuation: null,
    });
  });

  it("carries the run's settings and the layout enum", () => {
    expect(digestContext({ wordlist: "english_1k", race: true, punctuation: false, confidence: "all" }, "touch", false, true)).toEqual({
      input: "touch", layout: "qwerty", std: false, wordlist: "english_1k", fixMode: "none",
      suddenDeath: false, drill: false, race: true, punctuation: false,
    });
  });
});
