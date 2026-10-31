import { describe, expect, it } from "vitest";
import { DEFAULT_HAND_LAYOUT } from "../hand-layout";
import { BLINK_PRESETS, RADIUS_PRESETS, SMOOTH_PRESETS, STYLES, THICKNESS_PRESETS } from "@/app/customise/_components/rows/caret-row";
import { colourModeLabel, fontLabel, fontSizeLabel, handLayoutLabel, plainValue, practiceLengthLabel, sliceValueLabel } from "./labels";

describe("sliceValueLabel", () => {
  it("names every caret option as the caret controls do", () => {
    for (const s of STYLES) expect(sliceValueLabel("caret", "style", s.id)).toBe(s.label);
    for (const p of SMOOTH_PRESETS) expect(sliceValueLabel("caret", "smoothSpeed", p.value)).toBe(p.label);
    for (const p of BLINK_PRESETS) expect(sliceValueLabel("caret", "blinkSpeed", p.value)).toBe(p.label);
    for (const p of RADIUS_PRESETS) expect(sliceValueLabel("caret", "radius", p.value)).toBe(p.label);
    for (const p of THICKNESS_PRESETS) expect(sliceValueLabel("caret", "width", p.value)).toBe(p.label);
  });

  it("uses the settings controls' own option labels", () => {
    expect(sliceValueLabel("caret", "style", "underline")).toBe("Under");
    expect(sliceValueLabel("caret", "smoothSpeed", 120)).toBe("Smooth");
    expect(sliceValueLabel("caret", "smoothSpeed", 75)).toBe("75 ms");
    expect([sliceValueLabel("caret", "radius", 6), sliceValueLabel("caret", "radius", 4)]).toEqual(["Round", "4px"]);
    expect(sliceValueLabel("appearance", "highlightMode", "next-word")).toBe("Next word");
    expect(sliceValueLabel("appearance", "keymapTopRow", "layout")).toBe("Auto");
    expect(sliceValueLabel("appearance", "keymapSize", 1.1)).toBe("1.1×");
    expect(sliceValueLabel("appearance", "keymapSize", 1)).toBe("1.0×");
    expect(sliceValueLabel("appearance", "maxLineWidth", 0)).toBe("Full");
    expect(sliceValueLabel("appearance", "liveStatsColor", "")).toBe("Accent");
    expect(sliceValueLabel("background", "imageUrl", "")).toBe("None");
    expect(sliceValueLabel("audio", "keypressClickVolume", 35)).toBe("35%");
  });

  it("names a test length by its mode", () => {
    expect(sliceValueLabel("practice", "length", 15, "TIME")).toBe("15 seconds");
    expect(sliceValueLabel("practice", "length", 3, "QUOTE")).toBe("Extra long");
    expect(practiceLengthLabel("QUOTE", 9)).toBe("Quote");
    expect(practiceLengthLabel("WORDS", 25)).toBe("25 words");
  });

  it("reads a value named like an Object.prototype member as itself", () => {
    expect(sliceValueLabel("caret", "style", "constructor")).toBe("Constructor");
    expect(sliceValueLabel("appearance", "keymap", "toString")).toBe("ToString");
  });

  it("falls back to plain words", () => {
    expect([plainValue(true), plainValue(3), plainValue("text-only"), plainValue(null)]).toEqual(["On", "3", "Text only", "None"]);
  });
});

describe("font, mode and hand layout labels", () => {
  it("names a font stack and a size", () => {
    expect(fontLabel(null)).toBe("Default");
    expect(fontLabel("Georgia, serif")).toBe("Georgia");
    expect(fontLabel('"Roboto Mono", ui-monospace, monospace')).toBe("Roboto Mono");
    expect([fontSizeLabel(null), fontSizeLabel("1.2"), fontSizeLabel("x")]).toEqual(["40px", "48px", "40px"]);
  });

  it("names light, dark and system", () => {
    expect([colourModeLabel("dark"), colourModeLabel(null), colourModeLabel("constructor")]).toEqual(["Dark", "System", "System"]);
  });

  it("describes the hand layout in a few words", () => {
    expect(handLayoutLabel(DEFAULT_HAND_LAYOUT.fingers)).toBe("10 fingers, standard home keys");
    expect(handLayoutLabel({ ...DEFAULT_HAND_LAYOUT.fingers, R5: { enabled: false, homeKey: "KeyP" } })).toBe("9 fingers, your own home keys");
    expect(handLayoutLabel(null)).toBe("Standard");
  });
});
