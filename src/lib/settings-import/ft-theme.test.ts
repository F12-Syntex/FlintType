import { describe, expect, it } from "vitest";
import { validPalette, validThemeValue } from "./ft-theme";

describe("validThemeValue", () => {
  it("checks size against the 20px to 80px control", () => {
    expect(validThemeValue("--ft-font-scale", "0.5")).toBe("0.5");
    expect(validThemeValue("--ft-font-scale", "2")).toBe("2");
    for (const bad of ["50", "0.1", "1.2em", "big"]) expect(validThemeValue("--ft-font-scale", bad)).toBeUndefined();
  });

  it("checks word spacing in em, up to 1em", () => {
    expect(validThemeValue("--ft-word-spacing", "0.45em")).toBe("0.45em");
    for (const bad of ["9em", "0.45", "4px"]) expect(validThemeValue("--ft-word-spacing", bad)).toBeUndefined();
  });

  it("checks corners up to the roundest preset", () => {
    for (const ok of ["0", "0rem", "1.5rem", "8px"]) expect(validThemeValue("--radius", ok)).toBe(ok);
    for (const bad of ["40rem", "-1rem", "50%"]) expect(validThemeValue("--radius", bad)).toBeUndefined();
  });

  it("leaves colours to the safe-value check", () => {
    expect(validThemeValue("--primary", "#123456")).toBe("#123456");
    expect(validThemeValue("--primary", "red; x")).toBeUndefined();
  });
});

describe("validPalette", () => {
  it("rebuilds a named palette from the registry", () => {
    expect(validPalette({ activeId: "nord", varsLight: { evil: 1 } })).toMatchObject({ activeId: "nord" });
    expect(validPalette({ activeId: null })).toEqual({ activeId: null });
  });

  it("refuses an unknown or prototype-named palette", () => {
    for (const id of ["nope", "constructor", "__proto__", 5]) expect(validPalette({ activeId: id })).toBeUndefined();
    expect(validPalette("nord")).toBeUndefined();
  });

  it("keeps a custom fork's base only when the registry has it", () => {
    expect(validPalette({ activeId: "custom", base: { id: "nord" } })?.base?.id).toBe("nord");
    expect(validPalette({ activeId: "custom", base: { id: "gone" } })).toEqual({ activeId: "custom" });
  });
});
