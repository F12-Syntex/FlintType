import { describe, expect, it } from "vitest";
import { shareLengthLabel } from "./share-length-label";

describe("shareLengthLabel", () => {
  it("labels a TIME run in seconds", () => {
    expect(shareLengthLabel("time", 60)).toBe("Time · 60s");
  });

  it("labels a QUOTE run by group name", () => {
    expect(shareLengthLabel("quote", 0)).toBe("Quote · short");
    expect(shareLengthLabel("quote", 1)).toBe("Quote · medium");
    expect(shareLengthLabel("quote", 2)).toBe("Quote · long");
    expect(shareLengthLabel("quote", 3)).toBe("Quote · thicc");
  });

  it("falls back to bare 'Quote' for an out-of-range group index", () => {
    expect(shareLengthLabel("quote", 9)).toBe("Quote");
  });

  it("labels a WORDS run with the count", () => {
    expect(shareLengthLabel("words", 50)).toBe("Words · 50");
  });

  it("drops the unit prefix on legacy rows (null) rather than guessing 'Words'", () => {
    const label = shareLengthLabel(null, 60);
    expect(label).toBe("60");
    expect(label).not.toContain("Words");
  });
});
