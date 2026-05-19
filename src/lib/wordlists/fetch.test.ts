import { describe, expect, it } from "vitest";

import { normaliseWordlist } from "./fetch";

describe("normaliseWordlist", () => {
  it("lowercases the english pool so 'I' becomes 'i'", () => {
    const out = normaliseWordlist("english", {
      name: "english",
      words: ["the", "I", "you", "Am"],
    });
    expect(out.words).toEqual(["the", "i", "you", "am"]);
  });

  it("lowercases every english_* variant", () => {
    expect(
      normaliseWordlist("english_1k", {
        name: "english_1k",
        words: ["I", "Hello"],
      }).words,
    ).toEqual(["i", "hello"]);
    expect(
      normaliseWordlist("english_contractions", {
        name: "english_contractions",
        words: ["I'm", "She'll"],
      }).words,
    ).toEqual(["i'm", "she'll"]);
  });

  it("returns the input unchanged when no characters were touched", () => {
    const input = {
      name: "english",
      words: ["the", "of", "to"],
    };
    expect(normaliseWordlist("english", input)).toBe(input);
  });

  it("leaves non-english wordlists alone (preserves German nouns etc.)", () => {
    const input = {
      name: "german",
      words: ["der", "Hund", "Katze"],
    };
    expect(normaliseWordlist("german", input).words).toEqual([
      "der",
      "Hund",
      "Katze",
    ]);
  });
});
