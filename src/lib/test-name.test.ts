import { describe, expect, it } from "vitest";
import { QUOTE_LENGTH_NAMES, formatTestName, lengthLabel, modeLabel } from "./test-name";

describe("lengthLabel", () => {
  it("names word counts, singular and plural", () => {
    expect(lengthLabel("words", 25)).toBe("25 words");
    expect(lengthLabel("words", 1)).toBe("1 word");
    expect(lengthLabel("words", 0)).toBe("0 words");
  });

  it("names timed lengths in seconds, singular and plural", () => {
    expect(lengthLabel("time", 60)).toBe("60 seconds");
    expect(lengthLabel("time", 1)).toBe("1 second");
  });

  it("groups thousands", () => {
    expect(lengthLabel("words", 1000)).toBe("1,000 words");
  });

  it("names every quote group, and never the data bucket", () => {
    expect(lengthLabel("quote", 0)).toBe("Short quote");
    expect(lengthLabel("quote", 1)).toBe("Medium quote");
    expect(lengthLabel("quote", 2)).toBe("Long quote");
    expect(lengthLabel("quote", 3)).toBe("Extra-long quote");
    expect(QUOTE_LENGTH_NAMES.join(" ").toLowerCase()).not.toContain("thicc");
  });

  it("falls back to a bare Quote outside the groups", () => {
    expect(lengthLabel("quote", 4)).toBe("Quote");
    expect(lengthLabel("quote", -1)).toBe("Quote");
    expect(lengthLabel("quote", 1.5)).toBe("Quote");
  });

  it("guesses the unit for legacy rows with no length mode", () => {
    expect(lengthLabel(null, 15)).toBe("15 seconds");
    expect(lengthLabel(null, 30)).toBe("30 seconds");
    expect(lengthLabel(null, 60)).toBe("60 seconds");
    expect(lengthLabel(null, 120)).toBe("120 seconds");
    expect(lengthLabel(null, 50)).toBe("50 words");
    expect(lengthLabel(null, 25)).toBe("25 words");
  });

  it("reads junk lengths as 0", () => {
    expect(lengthLabel("words", Number.NaN)).toBe("0 words");
    expect(lengthLabel("time", -5)).toBe("0 seconds");
  });
});

describe("modeLabel", () => {
  it("maps each stored mode", () => {
    expect(modeLabel("casual")).toBe("Casual");
    expect(modeLabel("training")).toBe("Adapt");
    expect(modeLabel("race")).toBe("Race");
    expect(modeLabel("reverse_adaptive")).toBe("Reverse");
  });

  it("reads anything else as Casual", () => {
    expect(modeLabel("mt_import")).toBe("Casual");
    expect(modeLabel("")).toBe("Casual");
  });
});

describe("formatTestName", () => {
  it("names an Adapt word test", () => {
    expect(formatTestName({ mode: "training", lengthMode: "words", length: 25 })).toEqual({
      length: "25 words",
      mode: "Adapt",
      noun: "Adapt test of 25 words",
      group: "Adapt tests of 25 words",
    });
  });

  it("names a Casual timed test, singular too", () => {
    const t = formatTestName({ mode: "casual", lengthMode: "time", length: 60 });
    expect(t.noun).toBe("Casual test of 60 seconds");
    expect(t.group).toBe("Casual tests of 60 seconds");
    const one = formatTestName({ mode: "casual", lengthMode: "time", length: 1 });
    expect(one.noun).toBe("Casual test of 1 second");
    expect(one.group).toBe("Casual tests of 1 second");
  });

  it("uses the plain noun for races", () => {
    const t = formatTestName({ mode: "race", lengthMode: "words", length: 25 });
    expect(t.mode).toBe("Race");
    expect(t.noun).toBe("race of 25 words");
    expect(t.group).toBe("races of 25 words");
  });

  it("names Reverse tests", () => {
    const t = formatTestName({ mode: "reverse_adaptive", lengthMode: "words", length: 50 });
    expect(t.noun).toBe("Reverse test of 50 words");
    expect(t.group).toBe("Reverse tests of 50 words");
  });

  it("names quote tests with an article", () => {
    expect(formatTestName({ mode: "casual", lengthMode: "quote", length: 0 }).noun).toBe(
      "Casual test with a short quote",
    );
    expect(formatTestName({ mode: "casual", lengthMode: "quote", length: 2 })).toEqual({
      length: "Long quote",
      mode: "Casual",
      noun: "Casual test with a long quote",
      group: "Casual tests with long quotes",
    });
    const xl = formatTestName({ mode: "casual", lengthMode: "quote", length: 3 });
    expect(xl.noun).toBe("Casual test with an extra-long quote");
    expect(xl.group).toBe("Casual tests with extra-long quotes");
  });

  it("names an out-of-range quote group plainly", () => {
    const t = formatTestName({ mode: "casual", lengthMode: "quote", length: 7 });
    expect(t.length).toBe("Quote");
    expect(t.noun).toBe("Casual test with a quote");
    expect(t.group).toBe("Casual tests with quotes");
  });

  it("uses the legacy guess for noun and group", () => {
    const timed = formatTestName({ mode: "casual", lengthMode: null, length: 60 });
    expect(timed.noun).toBe("Casual test of 60 seconds");
    const words = formatTestName({ mode: "casual", lengthMode: null, length: 40 });
    expect(words.group).toBe("Casual tests of 40 words");
  });

  it("defaults a missing mode to Casual", () => {
    expect(formatTestName({ lengthMode: "words", length: 10 }).noun).toBe("Casual test of 10 words");
  });

  it("adds the touch suffix to the group only", () => {
    const t = formatTestName({ mode: "training", lengthMode: "words", length: 25, touch: true });
    expect(t.group).toBe("Adapt tests of 25 words on a touch screen");
    expect(t.noun).toBe("Adapt test of 25 words");
  });

  it("never outputs thicc or a dot separator, whatever the input", () => {
    const modes = ["casual", "training", "race", "reverse_adaptive", "mt_x", ""];
    const lengthModes = ["words", "time", "quote", null] as const;
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31;
      return seed / 2 ** 31;
    };
    for (let i = 0; i < 2000; i++) {
      const length = [rand() * 10 - 2, Math.floor(rand() * 300), 3, Number.NaN][i % 4];
      const t = formatTestName({
        mode: modes[Math.floor(rand() * modes.length)],
        lengthMode: lengthModes[Math.floor(rand() * lengthModes.length)],
        length,
        touch: rand() < 0.5,
      });
      for (const s of [t.length, t.mode, t.noun, t.group]) {
        expect(s.toLowerCase()).not.toContain("thicc");
        expect(s).not.toContain("·");
        expect(s).not.toContain("NaN");
      }
    }
  });
});
