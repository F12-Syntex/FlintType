import { describe, expect, it } from "vitest";
import { bool, lookup, mtText, MtCollector, num, own, percentText, str } from "./mt-values";

describe("MonkeyType value readers", () => {
  it("read only the file's own keys", () => {
    const mt = JSON.parse('{"a":"x","__proto__":"p"}') as Record<string, unknown>;
    expect(own(mt, "a")).toBe("x");
    expect(own(mt, "__proto__")).toBe("p");
    expect(own(mt, "constructor")).toBeUndefined();
    expect(str(mt, "toString")).toBeUndefined();
  });

  it("match only a table's own entries", () => {
    const table = { off: 0, on: 1 };
    expect(lookup(table, "on")).toBe(1);
    expect(lookup(table, "constructor")).toBeUndefined();
    expect(lookup(table, "__proto__")).toBeUndefined();
    expect(lookup(table, 1)).toBeUndefined();
  });

  it("read numbers, numeric strings and booleans", () => {
    expect(num({ v: "0.5" }, "v")).toBe(0.5);
    expect(num({ v: "" }, "v")).toBeUndefined();
    expect(num({ v: Number.NaN }, "v")).toBeUndefined();
    expect(bool({ v: "true" }, "v")).toBeUndefined();
    expect(bool({ v: false }, "v")).toBe(false);
  });

  it("put values in plain words", () => {
    expect(mtText("next_word")).toBe("Next word");
    expect(mtText(true)).toBe("On");
    expect(mtText(["a", ["b"]])).toBe("A, List");
    expect(mtText("")).toBe("None");
    expect(mtText("x".repeat(80))).toHaveLength(60);
    expect(percentText(0.35)).toBe("35%");
  });
});

describe("MtCollector", () => {
  it("lists a junk value only when the file has the key", () => {
    const col = new MtCollector({ a: 5 });
    col.junk("a", "A");
    col.junk("missing", "Missing");
    expect(col.skipped).toEqual([expect.objectContaining({ key: "a", label: "A", value: "5", reason: "bad-value" })]);
    expect(col.used.has("a")).toBe(true);
  });

  it("records where a slice value came from", () => {
    const col = new MtCollector({});
    col.slice("caret", "caret", "style", "Style", "Default", "line");
    expect(col.out[0]).toMatchObject({ id: "caret.style", group: "caret", origin: "From Default", to: "Line" });
  });
});
