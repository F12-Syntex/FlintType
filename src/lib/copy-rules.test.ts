import { describe, expect, it } from "vitest";
import { bannedPatterns } from "./copy-rules";

describe("bannedPatterns", () => {
  it("passes a plain sentence", () => {
    expect(bannedPatterns("You paused before 3 words, 2.4 seconds in all.")).toEqual([]);
    expect(bannedPatterns("How long does a mistake cost you?")).toEqual([]);
  });

  it("accepts a sentence that opens with a digit or a quote", () => {
    expect(bannedPatterns("12 more Adapt tests of 25 words.")).toEqual([]);
    expect(bannedPatterns("“the” slowed you most.")).toEqual([]);
  });

  it("accepts a closing quote after the full stop", () => {
    expect(bannedPatterns("Smooth out “th.”")).toEqual([]);
    expect(bannedPatterns("Did you mean “the?”")).toEqual([]);
  });

  it.each([
    ["Casual · 60 seconds.", 'contains "·"'],
    ["Ready • locked.", 'contains "•"'],
    ["Fast — but not clean.", "contains an em dash"],
    ["You are 67% to level 4.", 'contains "% to "'],
    ["About 12% over your usual.", 'contains "% over "'],
    ["About 12% vs usual.", 'contains "% vs "'],
    ["You reached 80% of your goal.", 'contains "% of your goal"'],
    ["A new best!", "contains an exclamation mark"],
    ["About 1.8× as long.", 'contains "×"'],
    ["Two  spaces.", "contains a double space"],
  ])("flags %j", (s, rule) => {
    expect(bannedPatterns(s)).toContain(rule);
  });

  it("flags a sentence that starts in lower case", () => {
    expect(bannedPatterns("you paused before 3 words.")).toEqual([
      "does not start with a capital letter, a digit or an opening quote",
    ]);
  });

  it("flags a sentence without a closing full stop", () => {
    expect(bannedPatterns("You paused before 3 words")).toEqual([
      "does not end with a full stop or a question mark",
    ]);
    expect(bannedPatterns("Smooth out “th”")).toEqual([
      "does not end with a full stop or a question mark",
    ]);
  });

  it("skips the sentence shape for headings but keeps the glyph rules", () => {
    expect(bannedPatterns("Where your time goes", { heading: true })).toEqual([]);
    expect(bannedPatterns("start typing", { heading: true })).toEqual([]);
    expect(bannedPatterns("Casual · 60s", { heading: true })).toEqual(['contains "·"']);
  });

  it("lists every rule a string breaks", () => {
    expect(bannedPatterns("wow · 50% to go!")).toHaveLength(5);
  });

  it("treats an empty string as a broken sentence but a clean heading", () => {
    expect(bannedPatterns("")).toHaveLength(2);
    expect(bannedPatterns("", { heading: true })).toEqual([]);
  });
});
