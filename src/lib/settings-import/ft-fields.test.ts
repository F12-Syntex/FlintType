import { describe, expect, it } from "vitest";
import { FT_FIELDS, validValue, type Spec } from "./ft-fields";
import { SLICE_DEFAULTS } from "./slices";

describe("FT_FIELDS", () => {
  it("has a spec for every field of every slice's defaults, and nothing else", () => {
    for (const [slice, defaults] of Object.entries(SLICE_DEFAULTS)) {
      const fields = Object.keys(FT_FIELDS[slice as keyof typeof FT_FIELDS]);
      const expected = slice === "handLayout" ? [] : Object.keys(defaults);
      expect([slice, fields.sort()]).toEqual([slice, expected.sort()]);
    }
  });

  it("accepts every default as valid", () => {
    for (const [slice, fields] of Object.entries(FT_FIELDS)) {
      const defaults = SLICE_DEFAULTS[slice as keyof typeof SLICE_DEFAULTS] as Record<string, unknown>;
      for (const [field, def] of Object.entries(fields)) {
        expect([slice, field, validValue(def.spec, defaults[field]) !== undefined]).toEqual([slice, field, true]);
      }
    }
  });
});

describe("validValue", () => {
  const e: Spec = { kind: "enum", values: ["a", "b"] };
  it("takes an enum's own values only", () => {
    expect(validValue(e, "a")).toBe("a");
    expect(validValue(e, "c")).toBeUndefined();
    expect(validValue(e, "constructor")).toBeUndefined();
    expect(validValue(e, 1)).toBeUndefined();
  });

  it("takes booleans only for a switch", () => {
    expect(validValue({ kind: "bool" }, false)).toBe(false);
    expect(validValue({ kind: "bool" }, "true")).toBeUndefined();
  });

  it("clamps and rounds numbers into range", () => {
    const n: Spec = { kind: "num", min: 1, max: 8, int: true };
    expect([validValue(n, 0), validValue(n, 99), validValue(n, 2.6)]).toEqual([1, 8, 3]);
    expect(validValue(n, Number.NaN)).toBeUndefined();
    expect(validValue(n, "3")).toBeUndefined();
  });

  it("allows 0 or the range when 0 means unbounded", () => {
    const z: Spec = { kind: "num", min: 30, max: 200, int: true, zero: true };
    expect([validValue(z, 0), validValue(z, 1), validValue(z, 250)]).toEqual([0, 30, 200]);
    expect(validValue(z, -1)).toBeUndefined();
  });

  it("takes short, long and alpha hex colours, or none", () => {
    for (const ok of ["", "#abc", "#AABBCC", "#aabbcc80"]) expect(validValue({ kind: "colour" }, ok)).toBe(ok);
    for (const bad of ["red", "#abcd", "#ggg", 5]) expect(validValue({ kind: "colour" }, bad)).toBeUndefined();
  });

  it("takes web links up to 2,048 characters, or none", () => {
    expect(validValue({ kind: "url" }, "")).toBe("");
    expect(validValue({ kind: "url" }, "https://example.com/a.png")).toBe("https://example.com/a.png");
    expect(validValue({ kind: "url" }, "javascript:alert(1)")).toBeUndefined();
    expect(validValue({ kind: "url" }, `https://x.com/${"a".repeat(2048)}`)).toBeUndefined();
  });
});
