import { describe, expect, it } from "vitest";
import { THEME_VARS } from "../theme-customization";
import { ERROR_TEXT, TYPED_TEXT, UNTYPED_TEXT } from "@/app/_components/passage/colors";
import { COLOUR_VARS, PASSAGE_COLOUR_FALLBACK, paletteName, shownColours, themeValueLabel, themeVarLabel } from "./theme-labels";

describe("theme labels", () => {
  it("names each override like its settings row", () => {
    expect(themeVarLabel("--primary")).toBe("Accent");
    expect(themeVarLabel("--ft-font-scale")).toBe("Size");
    expect(themeVarLabel("--unknown")).toBe("Colour");
    expect(themeVarLabel("constructor")).toBe("Colour");
  });

  it("reads an unset override as the palette's own", () => {
    expect(themeValueLabel("--primary", undefined)).toBe("Palette's own");
    expect(themeValueLabel("--primary", "#ABCDEF")).toBe("#abcdef");
    expect(themeValueLabel("--radius", "0rem")).toBe("0rem");
  });

  it("names word spacing presets, and shows other values as they are", () => {
    expect(themeValueLabel("--ft-word-spacing", "0.45em")).toBe("Loose");
    expect(themeValueLabel("--ft-word-spacing", undefined)).toBe("Normal");
    expect(themeValueLabel("--ft-word-spacing", "0.33em")).toBe("0.33em");
    expect(themeValueLabel("--ft-font-family", null)).toBe("Default");
  });

  it("names palettes as the Theme picker does", () => {
    expect([paletteName(null), paletteName("custom"), paletteName("background-reactive")]).toEqual([
      "Default", "Custom", "Background reactive",
    ]);
    expect(paletteName("nord")).toBe("Nord");
    expect(paletteName("gone")).toBe("Default");
  });
});

describe("COLOUR_VARS", () => {
  it("is every theme setting except corners, font, size and word spacing", () => {
    const rest = ["--radius", "--ft-font-family", "--ft-font-scale", "--ft-word-spacing"];
    expect([...COLOUR_VARS].sort()).toEqual(THEME_VARS.filter((v) => !rest.includes(v)).sort());
  });
});

describe("shownColours", () => {
  const css: Record<string, string> = { "--primary": " #f97316", "--muted-foreground": "#6b6b6b", "--destructive": "#e11d48", "--card": "#fff" };
  const read = (name: string) => css[name] ?? "";

  it("reads each colour as it is on screen", () => {
    expect(shownColours(read)).toMatchObject({ "--primary": "#f97316", "--card": "#fff" });
    expect(shownColours(read)).not.toHaveProperty("--border");
  });

  it("shows an unset passage colour as the colour the passage paints", () => {
    expect(shownColours(read)).toMatchObject({
      "--ft-passage-typed": "#f97316",
      "--ft-passage-untyped": "#6b6b6b",
      "--ft-passage-error": "#e11d48",
    });
    expect(shownColours((n) => (n === "--ft-passage-typed" ? "#123456" : read(n)))["--ft-passage-typed"]).toBe("#123456");
  });

  it("falls back the same way the passage does", () => {
    const classes: Record<string, string> = {
      "--ft-passage-typed": TYPED_TEXT,
      "--ft-passage-untyped": UNTYPED_TEXT,
      "--ft-passage-error": ERROR_TEXT,
    };
    for (const [name, fallback] of Object.entries(PASSAGE_COLOUR_FALLBACK)) {
      expect(classes[name]).toBe(`text-[var(${name},var(${fallback}))]`);
    }
  });
});
