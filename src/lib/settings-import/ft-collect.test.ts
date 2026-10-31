import { describe, expect, it } from "vitest";
import { FtCollector } from "./ft-collect";

describe("FtCollector", () => {
  it("tags each value with its group", () => {
    const col = new FtCollector((t) => (t.kind === "palette" ? "theme" : "rest"));
    col.add({ id: "palette", label: "Palette", to: "Nord", target: { kind: "palette" }, value: { activeId: "nord" } });
    expect(col.out[0].group).toBe("theme");
  });

  it("lists named bad values and counts the rest as one line", () => {
    const col = new FtCollector(() => "all");
    col.reject("caret.style", "Style");
    col.reject("caret.zzz");
    col.unrecognised();
    expect(col.skipped()).toEqual([
      expect.objectContaining({ key: "caret.style", label: "Style", reason: "bad-value" }),
      expect.objectContaining({ key: "unrecognised", label: "2 settings", count: 2 }),
    ]);
    expect(new FtCollector(() => "all").skipped()).toEqual([]);
  });
});
