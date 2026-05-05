import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./prefs-store", () => ({
  loadPrefs: vi.fn(async () => ({})),
  getCache: vi.fn(() => ({})),
  writeSlice: vi.fn(),
}));

import { writeSlice } from "./prefs-store";
import { importFlinttype, importMonkeytype } from "./import-export";

const mockWrite = vi.mocked(writeSlice);

beforeEach(() => {
  mockWrite.mockReset();
});

const writes = (): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const call of mockWrite.mock.calls) {
    out[call[0] as string] = call[1];
  }
  return out;
};

describe("importMonkeytype", () => {
  it("rejects non-objects", () => {
    expect(() => importMonkeytype(null)).toThrowError(/settings JSON object/i);
    expect(() => importMonkeytype("nope")).toThrowError(/settings JSON object/i);
  });

  it("maps the smoothCaret presets to caret.smoothSpeed in ms", () => {
    importMonkeytype({ smoothCaret: "medium" });
    const caret = writes().caret as { smoothSpeed?: number };
    expect(caret.smoothSpeed).toBe(250);
  });

  it("translates caretStyle 'default' to flinttype 'line'", () => {
    importMonkeytype({ caretStyle: "default" });
    const caret = writes().caret as { style?: string };
    expect(caret.style).toBe("line");
  });

  it("collapses MT confidence enums into our three-step enum", () => {
    importMonkeytype({ confidenceMode: "max" });
    const b = writes().behaviour as { confidence?: string };
    expect(b.confidence).toBe("all");
  });

  it("treats stopOnError 'word' as on", () => {
    importMonkeytype({ stopOnError: "word" });
    const b = writes().behaviour as { stopOnError?: boolean };
    expect(b.stopOnError).toBe(true);
  });

  it("maps customBackground + filter array onto the background slice", () => {
    importMonkeytype({
      customBackground: "https://example.com/x.jpg",
      customBackgroundSize: "cover",
      // [blur, brightness, saturation, opacity]
      customBackgroundFilter: [3, 0.7, 1, 0.85],
    });
    const bg = writes().background as Record<string, unknown>;
    expect(bg.imageUrl).toBe("https://example.com/x.jpg");
    expect(bg.fit).toBe("cover");
    expect(bg.blur).toBe(3);
    expect(bg.opacity).toBeCloseTo(0.85);
    // brightness 0.7 → darken 0.3
    expect(bg.darken).toBeCloseTo(0.3, 5);
  });

  it("applies customThemeColors as theme overrides when customTheme is true", () => {
    importMonkeytype({
      customTheme: true,
      customThemeColors: [
        "#111111", // 0 bg
        "#ff8800", // 1 main
        "#777777", // 2 caption (ignored)
        "#aaaaaa", // 3 sub
        "#eeeeee", // 4 text
        "#cc0000", // 5 error → --ft-passage-error
      ],
      // Should NOT write a palette pick when custom colours are active.
      theme: "monokai",
    });
    const w = writes();
    const t = w.theme as Record<string, string>;
    expect(t["--background"]).toBe("#111111");
    expect(t["--card"]).toBe("#111111");
    expect(t["--muted"]).toBe("#111111");
    expect(t["--primary"]).toBe("#ff8800");
    expect(t["--accent"]).toBe("#ff8800");
    expect(t["--ring"]).toBe("#ff8800");
    // mainColor doubles as the typed-letter colour in MT — the passage
    // consumes --ft-passage-typed directly.
    expect(t["--ft-passage-typed"]).toBe("#ff8800");
    expect(t["--muted-foreground"]).toBe("#aaaaaa");
    expect(t["--border"]).toBe("#aaaaaa");
    // subColor is the untyped-letter colour.
    expect(t["--ft-passage-untyped"]).toBe("#aaaaaa");
    // textColor is chrome body text, independent of the typed letter.
    expect(t["--foreground"]).toBe("#eeeeee");
    expect(t["--card-foreground"]).toBe("#eeeeee");
    // errorColor is the passage-only mistyped-char colour.
    expect(t["--ft-passage-error"]).toBe("#cc0000");
    // Custom colours present → palette must be promoted to "custom" so
    // the picker reads as Custom (not as the unrelated `theme` name).
    expect(w.palette).toEqual({ activeId: "custom" });
  });

  it("uses textColor for typed letters when colorfulMode is false", () => {
    importMonkeytype({
      customTheme: true,
      colorfulMode: false,
      customThemeColors: [
        "#111111",
        "#ff8800",
        "#777777",
        "#aaaaaa",
        "#eeeeee",
        "#cc0000",
      ],
    });
    const t = writes().theme as Record<string, string>;
    // colorful off → typed paints in textColor, not mainColor.
    expect(t["--ft-passage-typed"]).toBe("#eeeeee");
    expect(t["--ft-passage-untyped"]).toBe("#aaaaaa");
  });

  it("swaps typed and untyped colours when flipTestColors is true", () => {
    importMonkeytype({
      customTheme: true,
      flipTestColors: true,
      customThemeColors: [
        "#111111",
        "#ff8800",
        "#777777",
        "#aaaaaa",
        "#eeeeee",
        "#cc0000",
      ],
    });
    const t = writes().theme as Record<string, string>;
    // Flipped: typed gets sub, untyped gets the colorful main.
    expect(t["--ft-passage-typed"]).toBe("#aaaaaa");
    expect(t["--ft-passage-untyped"]).toBe("#ff8800");
  });

  it("promotes palette to 'custom' even when only typography overrides exist", () => {
    importMonkeytype({
      // No customTheme / customThemeColors — just font overrides.
      fontFamily: "JetBrains_Mono",
    });
    const w = writes();
    expect(w.theme).toBeDefined();
    expect(w.palette).toEqual({ activeId: "custom" });
  });

  it("maps liveStatsOpacity and liveStatsColor onto appearance", () => {
    importMonkeytype({
      customTheme: true,
      liveStatsOpacity: 0.4,
      liveStatsColor: "main",
      customThemeColors: [
        "#111111",
        "#ff8800",
        "#777777",
        "#aaaaaa",
        "#eeeeee",
        "#cc0000",
      ],
    });
    const a = writes().appearance as Record<string, unknown>;
    expect(a.liveStatsOpacity).toBeCloseTo(0.4);
    // "main" resolved against customThemeColors[1] → #ff8800.
    expect(a.liveStatsColor).toBe("#ff8800");
  });

  it("translates pageWidth to a maxLineWidth budget", () => {
    importMonkeytype({ pageWidth: "125" });
    const a = writes().appearance as Record<string, unknown>;
    expect(a.maxLineWidth).toBe(100);
  });

  it("translates pageWidth='max' to maxLineWidth 0 (stretch)", () => {
    importMonkeytype({ pageWidth: "max" });
    const a = writes().appearance as Record<string, unknown>;
    expect(a.maxLineWidth).toBe(0);
  });

  it("falls back to palette pick when customTheme is false", () => {
    importMonkeytype({
      customTheme: false,
      // light-green is one of the registered tweakcn community themes.
      theme: "light-green",
      customThemeColors: ["#111111", "#222222", "#333333"],
    });
    const w = writes();
    expect(w.palette).toEqual({ activeId: "light-green" });
    // Custom colours stayed in MT as a saved blob; we should not have
    // imported them as overrides.
    expect(w.theme).toBeUndefined();
  });

  it("imports fontFamily and fontSize as --ft-font-* overrides", () => {
    importMonkeytype({
      fontFamily: "JetBrains_Mono",
      fontSize: 1.25,
    });
    const t = writes().theme as Record<string, string>;
    expect(t["--ft-font-family"]).toBe('"JetBrains Mono", ui-monospace, monospace');
    expect(t["--ft-font-scale"]).toBe("1.25");
  });

  it("clamps fontSize into the supported range", () => {
    importMonkeytype({ fontSize: 99 });
    const t = writes().theme as Record<string, string>;
    expect(t["--ft-font-scale"]).toBe("3");
  });

  it("translates the example settings.json end-to-end", () => {
    // Trimmed copy of the user's monkeytype export — the assertions
    // below check every slice the importer is supposed to populate.
    importMonkeytype({
      smoothCaret: "medium",
      caretStyle: "default",
      quickRestart: "tab",
      stopOnError: "off",
      confidenceMode: "off",
      difficulty: "normal",
      blindMode: false,
      customBackground: "",
      customBackgroundSize: "cover",
      customBackgroundFilter: [0, 1, 1, 0.8],
      highlightMode: "letter",
      typedEffect: "keep",
      tapeMode: "off",
      tapeMargin: 50,
      smoothLineScroll: false,
      showAllLines: false,
      maxLineWidth: 0,
      typingSpeedUnit: "wpm",
      keymapMode: "next",
      keymapStyle: "staggered",
      keymapLegendStyle: "lowercase",
      keymapLayout: "qwerty",
      keymapShowTopRow: "layout",
      keymapSize: 1.1,
      mode: "words",
      words: 10,
      time: 15,
    });
    const w = writes();
    expect((w.caret as { smoothSpeed: number }).smoothSpeed).toBe(250);
    expect((w.caret as { style: string }).style).toBe("line");
    expect((w.behaviour as { quickRestart: boolean }).quickRestart).toBe(true);
    expect((w.appearance as { typedEffect: string }).typedEffect).toBe("off");
    expect((w.appearance as { keymap: string }).keymap).toBe("next");
    expect((w.practice as { mode: string; length: number }).mode).toBe("WORDS");
    expect((w.practice as { length: number }).length).toBe(10);
  });
});

describe("importFlinttype", () => {
  it("rejects payloads without the flinttype marker", () => {
    expect(() => importFlinttype({})).toThrowError(/flinttype export/i);
    expect(() => importFlinttype({ app: "monkeytype", version: 1, slices: {} }))
      .toThrowError(/flinttype export/i);
  });

  it("writes every recognized slice from the export", () => {
    const n = importFlinttype({
      app: "flinttype",
      version: 1,
      exportedAt: "2026-01-01T00:00:00Z",
      slices: {
        caret: { style: "block" },
        behaviour: { difficulty: "expert" },
        unknown: { ignored: true },
      },
    });
    expect(n).toBe(2);
    const w = writes();
    expect(w.caret).toEqual({ style: "block" });
    expect(w.behaviour).toEqual({ difficulty: "expert" });
    expect(w.unknown).toBeUndefined();
  });
});
