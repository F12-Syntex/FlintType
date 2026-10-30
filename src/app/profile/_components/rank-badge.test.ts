import { describe, expect, it } from "vitest";
import { RANKS } from "@/types/rank";
import { rangePhrase } from "./rank-badge";

describe("rangePhrase", () => {
  it("spells a closed range with 'to'", () => {
    expect(rangePhrase("80–99")).toBe("80 to 99 wpm");
    expect(rangePhrase("0–29")).toBe("0 to 29 wpm");
  });

  it("spells an open range as 'and up'", () => {
    expect(rangePhrase("250+")).toBe("250 wpm and up");
  });

  it("reads every rank without a dash or a dot", () => {
    for (const def of Object.values(RANKS)) {
      const phrase = rangePhrase(def.range);
      expect(phrase).toMatch(/ wpm( and up)?$/);
      expect(phrase).not.toMatch(/[–·]/);
    }
  });
});
