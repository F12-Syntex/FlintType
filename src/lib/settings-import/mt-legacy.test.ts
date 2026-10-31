import { describe, expect, it } from "vitest";
import sample from "./fixtures/monkeytype-settings.json";
import { LEGACY_KEYS, migrateLegacy } from "./mt-legacy";
import { planMonkeytype } from "./monkeytype";
import { readCurrentSettings } from "./slices";

const valueOf = (mt: Record<string, unknown>, id: string) =>
  planMonkeytype(mt, readCurrentSettings(null), null)
    .groups.flatMap((g) => [...g.items, ...g.unchanged])
    .find((i) => i.id === id)?.value;

describe("migrateLegacy", () => {
  it("reads old string font sizes as MonkeyType does", () => {
    expect(migrateLegacy({ fontSize: "125" }).fontSize).toBe(1.25);
    expect(migrateLegacy({ fontSize: "15" }).fontSize).toBe(1.5);
    expect(migrateLegacy({ fontSize: "2" }).fontSize).toBe(2);
    expect(migrateLegacy({ fontSize: -3 }).fontSize).toBe(1);
    // 1.25rem is 20px, half of the 40px base.
    expect(valueOf({ fontSize: "125", mode: "time" }, "theme.--ft-font-scale")).toBe("0.5");
  });

  it("fills in sub alt for a nine-colour custom theme", () => {
    const nine = sample.customThemeColors.filter((_, i) => i !== 4);
    const out = migrateLegacy({ customThemeColors: nine }).customThemeColors as string[];
    expect(out).toHaveLength(10);
    expect(out[4]).toBe("#000000");
    expect(out[5]).toBe(sample.customThemeColors[5]);
    expect(valueOf({ customTheme: true, customThemeColors: nine }, "theme.--card")).toBe("#000000");
  });

  it("turns a boolean smooth caret and a numeric quote length into today's values", () => {
    expect(migrateLegacy({ smoothCaret: true }).smoothCaret).toBe("medium");
    expect(migrateLegacy({ smoothCaret: false }).smoothCaret).toBe("off");
    expect(migrateLegacy({ quoteLength: 2 }).quoteLength).toEqual([2]);
    expect(migrateLegacy({ quoteLength: -1 }).quoteLength).toEqual([0, 1, 2, 3]);
    expect(valueOf({ mode: "quote", quoteLength: 3 }, "practice.length")).toBe(3);
  });

  it("folds old keys into their new form and drops them", () => {
    const out = migrateLegacy({
      showLiveWpm: true, timerStyle: "text", alwaysShowCPM: true, keymapShowTopRow: "always", quickTab: true,
    });
    expect(out).toMatchObject({ liveSpeedStyle: "text", typingSpeedUnit: "cpm", keymapKeys: "minimal_numrow", quickRestart: "tab" });
    for (const k of LEGACY_KEYS) expect(Object.hasOwn(out, k)).toBe(false);
  });

  it("keeps the tape margin and line width inside MonkeyType's own bounds", () => {
    expect([5, -50, 50, 95].map((m) => migrateLegacy({ tapeMargin: m }).tapeMargin)).toEqual([10, 10, 50, 90]);
    expect([0, 5, -3, 120, 5000].map((w) => migrateLegacy({ maxLineWidth: w }).maxLineWidth)).toEqual([0, 20, 20, 120, 1000]);
    const plan = planMonkeytype({ tapeMargin: -50 }, readCurrentSettings(null), null);
    const margin = plan.groups.flatMap((g) => [...g.items, ...g.unchanged]).find((i) => i.id === "appearance.tapeMargin");
    expect(margin).toMatchObject({ value: 10, origin: "From 10%" });
  });

  it("renames the old wpm average to speed", () => {
    expect(migrateLegacy({ showAverage: "wpm" }).showAverage).toBe("speed");
    expect(migrateLegacy({ showAverage: "acc" }).showAverage).toBe("acc");
  });

  it("keeps today's values over an old key's", () => {
    expect(migrateLegacy({ alwaysShowCPM: true, typingSpeedUnit: "wpm" }).typingSpeedUnit).toBe("wpm");
    expect(migrateLegacy({ showTimerProgress: false, timerStyle: "mini" }).timerStyle).toBe("mini");
  });

  it("never changes the file object", () => {
    const file = { smoothCaret: true, quickTab: true };
    migrateLegacy(file);
    expect(file).toEqual({ smoothCaret: true, quickTab: true });
  });
});
