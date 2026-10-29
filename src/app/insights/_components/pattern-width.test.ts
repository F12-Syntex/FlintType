import { describe, expect, it } from "vitest";
import { KEY_MAX_CHARS, keyColumnChars, keyColumnWidths } from "./pattern-width";

const rows = (...keys: string[]) => keys.map((key) => ({ key }));

describe("key column width", () => {
  it("fits the longest key, so a word never breaks partway", () => {
    expect(keyColumnChars(rows("the", "extraordinarily", "and"))).toBe(15);
    const w = "calc(7.875rem + 0.75rem)";
    expect(keyColumnWidths(rows("extraordinarily"))).toEqual({ phone: w, wide: w, twoUp: w });
  });
  it("keeps room for the header", () => {
    expect(keyColumnChars(rows("th", "er"))).toBe(4);
    expect(keyColumnChars([])).toBe(4);
    expect(keyColumnChars([], KEY_MAX_CHARS.wide)).toBe(4);
  });
  it("caps a long key: 16 characters on a phone, 18 side by side, 24 otherwise", () => {
    const long = rows("internationalisation");
    expect(keyColumnChars(long)).toBe(16);
    expect(keyColumnChars(long, KEY_MAX_CHARS.wide)).toBe(20);
    expect(keyColumnChars(long, KEY_MAX_CHARS.twoUp)).toBe(18);
    expect(keyColumnWidths(long)).toEqual({
      phone: "calc(8.4rem + 0.75rem)",
      wide: "calc(10.5rem + 0.75rem)",
      twoUp: "calc(9.45rem + 0.75rem)",
    });
    expect(keyColumnChars(rows("a".repeat(30)), KEY_MAX_CHARS.wide)).toBe(24);
  });
  it("counts characters, not UTF-16 units", () => {
    expect(keyColumnChars(rows("naïveté"))).toBe(7);
    expect(keyColumnChars(rows("👍👍👍👍👍"))).toBe(5);
  });
});
