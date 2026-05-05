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

  it("does not write theme overrides when customTheme is true", () => {
    // Theme appearance is intentionally NOT imported from MonkeyType
    // (per user request: 3.24+) — even when customTheme is true and the
    // user has a saved customThemeColors blob, we leave the flinttype
    // theme + palette alone.
    importMonkeytype({
      customTheme: true,
      customThemeColors: [
        "#111111",
        "#ff8800",
        "#777777",
        "#aaaaaa",
        "#eeeeee",
        "#cc0000",
      ],
      theme: "monokai",
    });
    const w = writes();
    expect(w.theme).toBeUndefined();
    expect(w.palette).toBeUndefined();
  });

  it("does not write palette / theme even when customTheme is false and theme matches", () => {
    importMonkeytype({
      customTheme: false,
      // light-green is one of the registered tweakcn community themes —
      // the old importer would have set palette.activeId here. We skip.
      theme: "light-green",
    });
    const w = writes();
    expect(w.palette).toBeUndefined();
    expect(w.theme).toBeUndefined();
  });

  it("does not import fontFamily / fontSize", () => {
    // Typography is part of theme appearance — same skip rule.
    importMonkeytype({
      fontFamily: "JetBrains_Mono",
      fontSize: 1.25,
    });
    const w = writes();
    expect(w.theme).toBeUndefined();
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
