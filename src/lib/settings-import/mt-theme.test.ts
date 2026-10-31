import { describe, expect, it } from "vitest";
import { contrast, mix, normaliseHex } from "./colour";
import { colourNotes, customColours, deriveColours, isDarkBackground, mapThemeAndFont } from "./mt-theme";
import { MtCollector } from "./mt-values";

const SAMPLE = ["#132237", "#ebb723", "#ebb723", "#0b4c6c", "#0e1a29", "#1cbaac", "#da3333", "#791717", "#da3333", "#791717"];
const SERIKA_LIGHT = ["#e1e1e3", "#e2b714", "#e2b714", "#aaaeb3", "#d1d3d8", "#323437", "#da3333", "#791717", "#da3333", "#791717"];

const colours = (list: string[]) => customColours({ customTheme: true, customThemeColors: list })!;
const byName = (list: ReturnType<typeof deriveColours>) => Object.fromEntries(list.map((d) => [d.name, d.value]));

describe("colour helpers", () => {
  it("normalises hex and rejects anything else", () => {
    expect(normaliseHex("#ABC")).toBe("#aabbcc");
    expect(normaliseHex(" #132237 ")).toBe("#132237");
    expect(normaliseHex("red")).toBeNull();
    expect(normaliseHex("#12345")).toBeNull();
  });

  it("mixes and measures contrast", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
  });
});

describe("customColours", () => {
  it("needs the custom theme on and ten readable colours", () => {
    expect(customColours({ customTheme: false, customThemeColors: SAMPLE })).toBeNull();
    expect(customColours({ customTheme: true, customThemeColors: SAMPLE.slice(0, 9) })).toBeNull();
    expect(customColours({ customTheme: true, customThemeColors: SAMPLE })?.main).toBe("#ebb723");
  });
});

describe("deriveColours", () => {
  it("turns the sample scheme into flinttype colours", () => {
    expect(byName(deriveColours(colours(SAMPLE)))).toMatchObject({
      "--background": "#132237",
      "--foreground": "#1cbaac",
      "--primary": "#ebb723",
      "--primary-foreground": "#132237",
      "--card": "#0e1a29",
      "--muted-foreground": "#179999",
      "--accent": "#0f2733",
      "--border": "#0e3b57",
      "--ft-passage-typed": "#1cbaac",
      "--ft-passage-untyped": "#0b4c6c",
      "--ft-passage-error": "#da3333",
    });
    expect(isDarkBackground("#132237")).toBe(true);
  });

  it("keeps chrome text readable on light schemes", () => {
    const c = colours(SERIKA_LIGHT);
    const v = byName(deriveColours(c));
    expect(contrast(v["--primary"], c.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(v["--muted-foreground"], c.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(v["--muted-foreground"], c.subAlt)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(v["--primary-foreground"], v["--primary"])).toBeGreaterThanOrEqual(4.5);
    expect(isDarkBackground(c.bg)).toBe(false);
  });

  it("follows MonkeyType's flipped and colourful letter colours", () => {
    const c = colours(SAMPLE);
    const flipped = byName(deriveColours(c, { flipped: true }));
    expect([flipped["--ft-passage-typed"], flipped["--ft-passage-untyped"]]).toEqual([c.sub, c.text]);
    const colourful = byName(deriveColours(c, { colourful: true }));
    expect(colourful["--ft-passage-typed"]).toBe(c.main);
    expect(colourful["--ft-passage-error"]).toBe(c.colorfulError);
  });
});

describe("mapThemeAndFont", () => {
  const run = (mt: Record<string, unknown>) => {
    const col = new MtCollector(mt);
    mapThemeAndFont(col, customColours(mt));
    return col;
  };

  it("maps a font flinttype ships, and skips one it doesn't", () => {
    expect(run({ fontFamily: "JetBrains_Mono" }).out[0]).toMatchObject({
      id: "theme.--ft-font-family",
      to: "JetBrains Mono",
    });
    const georgia = run({ fontFamily: "Georgia" }).out[0];
    expect(georgia.value).toBe("Georgia, 'Times New Roman', serif");
    const comic = run({ fontFamily: "Comic_Sans_MS" });
    expect(comic.out).toEqual([]);
    expect(comic.skipped[0]).toMatchObject({ key: "fontFamily", value: "Comic Sans MS", note: "This font isn't included." });
  });

  it("converts the font size from rem to the Size control's px", () => {
    expect(run({ fontSize: 3 }).out[0]).toMatchObject({ value: "1.2", to: "48px" });
    // 2.5rem is 40px, the default: the override is cleared.
    expect(run({ fontSize: 2.5 }).out[0]).toMatchObject({ value: null, to: "40px" });
    expect(run({ fontSize: 100 }).out[0]).toMatchObject({ value: "2", to: "80px" });
  });

  it("sets dark or light mode from the background", () => {
    const light = run({ customTheme: true, customThemeColors: SERIKA_LIGHT });
    expect(light.out.find((i) => i.id === "mode")).toMatchObject({ value: "light", to: "Light" });
  });

  it("uses the theme keys only when colours come from them", () => {
    const keys = ["colorfulMode", "customTheme", "customThemeColors", "flipTestColors"];
    const custom = run({ customTheme: true, customThemeColors: SAMPLE, flipTestColors: false, colorfulMode: false });
    expect([...custom.used].sort()).toEqual(keys);
    const named = run({ customTheme: false, customThemeColors: SAMPLE, flipTestColors: true, colorfulMode: true });
    expect(named.used.size).toBe(0);
    expect(named.out).toEqual([]);
  });

  it("says the theme colours with no slot here in the Colours note", () => {
    expect(run({ customTheme: true, customThemeColors: SAMPLE }).notes).toEqual([
      { group: "colours", text: "Extra letters use your wrong-letter colour, so #791717 isn't used." },
    ]);
    const caret = colours(["#132237", "#ebb723", "#ff00ff", ...SAMPLE.slice(3)]);
    expect(colourNotes(caret)).toEqual([
      "The caret uses your accent colour, so #ff00ff isn't used.",
      "Extra letters use your wrong-letter colour, so #791717 isn't used.",
    ]);
    expect(colourNotes(colours(SAMPLE.map((c, i) => (i === 7 ? SAMPLE[6] : c))))).toEqual([]);
  });
});
