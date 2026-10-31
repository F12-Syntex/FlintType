import { describe, expect, it } from "vitest";
import sample from "./fixtures/monkeytype-settings.json";
import { mapLiveStats, mapResult } from "./mt-stats";
import { customColours } from "./mt-theme";
import { MtCollector } from "./mt-values";

const run = (mt: Record<string, unknown>, colours: ReturnType<typeof customColours> = null) => {
  const col = new MtCollector(mt);
  mapLiveStats(col, colours);
  mapResult(col);
  return col;
};
const valueOf = (col: MtCollector, id: string) => col.out.find((c) => c.id === id)?.value;

describe("MonkeyType live stats and result settings", () => {
  it("maps the timer styles, flash ones onto Flash", () => {
    expect(valueOf(run({ timerStyle: "flash_mini" }), "appearance.liveProgressStyle")).toBe("flash");
    const bar = run({ timerStyle: "bar" });
    expect(bar.skipped[0]).toMatchObject({ key: "timerStyle", note: "The bar style isn't available." });
  });

  it("reads timer opacity strings and clamps them", () => {
    expect(valueOf(run({ timerOpacity: "0.5" }), "appearance.liveStatsOpacity")).toBe(0.5);
    const faint = run({ timerOpacity: 0.05 }).out[0];
    expect(faint).toMatchObject({ value: 0.1, to: "10%", origin: "From 5%" });
  });

  it("maps timer colour to the live stats colour, stamping it as picked", () => {
    const main = run({ timerColor: "main" }).out.find((i) => i.id === "appearance.liveStatsColor");
    expect(main).toMatchObject({ value: "", extra: { liveStatsColorPicked: true } });
    const colours = customColours({ customTheme: true, customThemeColors: sample.customThemeColors });
    expect(valueOf(run({ timerColor: "sub" }, colours), "appearance.liveStatsColor")).toBe("#0b4c6c");
    const noColours = run({ timerColor: "sub" });
    expect(valueOf(noColours, "appearance.liveStatsColor")).toBeUndefined();
    expect(noColours.skipped[0]).toMatchObject({ key: "timerColor", reason: "bad-value" });
  });

  it("maps the result screen switches and speed unit", () => {
    const col = run({ typingSpeedUnit: "cpm", burstHeatmap: true, alwaysShowDecimalPlaces: false });
    expect(col.out.map((c) => [c.id, c.value])).toEqual([
      ["appearance.typingSpeedUnit", "cpm"],
      ["appearance.alwaysShowDecimal", false],
      ["appearance.resultShowHeatmap", true],
    ]);
  });
});

describe("MonkeyType stats values that can't be used", () => {
  const KEYS = [
    "timerStyle", "liveSpeedStyle", "liveAccStyle", "liveBurstStyle", "timerColor", "timerOpacity",
    "typingSpeedUnit", "alwaysShowDecimalPlaces", "startGraphsAtZero", "burstHeatmap",
  ];

  it("lists every mapped key whose value is junk, and writes nothing", () => {
    const col = run(Object.fromEntries(KEYS.map((k) => [k, { nested: true }])));
    expect(col.out).toEqual([]);
    expect(col.skipped.map((s) => s.key).sort()).toEqual([...KEYS].sort());
  });

  it("never matches a value named like an Object.prototype member", () => {
    for (const bad of ["constructor", "valueOf", "__proto__"]) {
      expect([bad, run(Object.fromEntries(KEYS.map((k) => [k, bad]))).out]).toEqual([bad, []]);
    }
  });
});
