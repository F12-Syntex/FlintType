import { describe, expect, it } from "vitest";
import { mapCaret, mapKeyboard, mapTypingArea } from "./mt-display";
import { MtCollector } from "./mt-values";

type Mapper = (col: MtCollector) => void;

const run = (map: Mapper, mt: Record<string, unknown>) => {
  const col = new MtCollector(mt);
  map(col);
  return col;
};
const valueOf = (col: MtCollector, id: string) => col.out.find((c) => c.id === id)?.value;
const all: Mapper = (col) => {
  mapCaret(col);
  mapTypingArea(col);
  mapKeyboard(col);
};

describe("MonkeyType display settings", () => {
  it("reads next_word highlight modes", () => {
    expect(valueOf(run(mapTypingArea, { highlightMode: "next_word" }), "appearance.highlightMode")).toBe("next-word");
    expect(valueOf(run(mapTypingArea, { highlightMode: "next_three_words" }), "appearance.highlightMode")).toBe("next-word");
  });

  it("snaps smooth caret onto the Movement presets in order", () => {
    const speed = (v: string) => valueOf(run(mapCaret, { smoothCaret: v }), "caret.smoothSpeed");
    expect([speed("off"), speed("fast"), speed("medium"), speed("slow")]).toEqual([0, 60, 120, 200]);
  });

  it("resolves keymap overrideSync to the emulated layout, or QWERTY", () => {
    expect(valueOf(run(mapKeyboard, { keymapLayout: "overrideSync", layout: "dvorak" }), "appearance.keymapLayout")).toBe("dvorak");
    expect(valueOf(run(mapKeyboard, { keymapLayout: "overrideSync", layout: "default" }), "appearance.keymapLayout")).toBe("qwerty");
    const azerty = run(mapKeyboard, { keymapLayout: "azerty" });
    expect(valueOf(azerty, "appearance.keymapLayout")).toBeUndefined();
    expect(azerty.skipped[0].key).toBe("keymapLayout");
  });

  it("maps keymap keys onto the number row and letters only", () => {
    const full = run(mapKeyboard, { keymapKeys: "full" });
    expect(valueOf(full, "appearance.keymapTopRow")).toBe("always");
    expect(valueOf(full, "appearance.keymapCompact")).toBe(false);
  });

  it("clamps line width", () => {
    expect(valueOf(run(mapTypingArea, { maxLineWidth: 1000 }), "appearance.maxLineWidth")).toBe(200);
    expect(valueOf(run(mapTypingArea, { maxLineWidth: 0 }), "appearance.maxLineWidth")).toBe(0);
  });

  it("says where a value came from in MonkeyType's words", () => {
    const col = run(mapKeyboard, { keymapKeys: "minimal", keymapSize: 1.1 });
    expect(col.out.find((c) => c.id === "appearance.keymapCompact")?.origin).toBe("From Minimal");
    // 1.1 fits the slider exactly, so the line would only repeat "1.1×".
    expect(col.out.find((c) => c.id === "appearance.keymapSize")).toMatchObject({ to: "1.1×", origin: "From 1.1×" });
    const odd = run(mapKeyboard, { keymapSize: 1.15 });
    expect(odd.out[0]).toMatchObject({ value: 1.2, to: "1.2×", origin: "From size 1.15" });
  });
});

describe("MonkeyType display values that can't be used", () => {
  const KEYS = [
    "caretStyle", "smoothCaret", "highlightMode", "typedEffect", "tapeMode", "tapeMargin", "showAllLines",
    "maxLineWidth", "smoothLineScroll", "keymapMode", "keymapLayout", "keymapStyle", "keymapLegendStyle",
    "keymapKeys", "keymapSize",
  ];

  it("lists every mapped key whose value is junk, and writes nothing", () => {
    const col = run(all, Object.fromEntries(KEYS.map((k) => [k, { nested: true }])));
    expect(col.out).toEqual([]);
    expect(col.skipped.map((s) => s.key).sort()).toEqual([...KEYS].sort());
    expect(col.skipped.every((s) => s.reason === "bad-value" && s.label && s.note)).toBe(true);
  });

  it("never matches a value named like an Object.prototype member", () => {
    for (const bad of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      const col = run(all, Object.fromEntries(KEYS.map((k) => [k, bad])));
      expect([bad, col.out]).toEqual([bad, []]);
      expect(col.skipped).toHaveLength(KEYS.length);
    }
  });

  it("leaves settings the file doesn't have alone, unlisted", () => {
    const col = run(all, {});
    expect(col.out).toEqual([]);
    expect(col.skipped).toEqual([]);
  });
});
