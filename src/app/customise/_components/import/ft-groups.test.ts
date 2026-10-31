import { describe, expect, it } from "vitest";
import { FT_GROUP_DEFS, ftGroupOf } from "./ft-groups";

describe("ftGroupOf", () => {
  it("puts each value on the settings page that shows it", () => {
    expect(ftGroupOf({ kind: "theme", name: "--primary" })).toBe("theme");
    expect(ftGroupOf({ kind: "theme", name: "--ft-font-family" })).toBe("typing");
    expect(ftGroupOf({ kind: "theme", name: "--radius" })).toBe("interface");
    expect(ftGroupOf({ kind: "palette" })).toBe("theme");
    expect(ftGroupOf({ kind: "slice", slice: "appearance", field: "keymapSize" })).toBe("keyboard");
    expect(ftGroupOf({ kind: "slice", slice: "appearance", field: "controlShape" })).toBe("interface");
    expect(ftGroupOf({ kind: "slice", slice: "appearance", field: "burstReps" })).toBe("behaviour");
    expect(ftGroupOf({ kind: "slice", slice: "caret", field: "style" })).toBe("typing");
    expect(ftGroupOf({ kind: "slice", slice: "practice", field: "mode" })).toBe("test");
  });

  it("lists the settings pages in sidebar order, then the test setup", () => {
    expect(FT_GROUP_DEFS.map((g) => g.name)).toEqual([
      "Theme", "Typing", "Interface", "Keyboard", "Stats & results", "Behaviour", "Multiplayer & social", "Test setup",
    ]);
  });
});
