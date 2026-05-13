import { describe, expect, it } from "vitest";
import {
  BOT_LINEUP,
  BOTS,
  botMistakesChar,
  capacityFor,
  instantBotWpm,
} from "./bots";

describe("race/bots", () => {
  it("nine profiles span ~40–200 WPM, 87–99% accuracy", () => {
    const wpms = Object.values(BOTS).map((b) => b.targetWpm);
    expect(Math.min(...wpms)).toBeLessThan(50);
    expect(Math.max(...wpms)).toBeGreaterThan(180);
    const accs = Object.values(BOTS).map((b) => b.accuracyTarget);
    expect(Math.min(...accs)).toBeLessThan(0.9);
    expect(Math.max(...accs)).toBeGreaterThanOrEqual(0.99);
  });

  it("every bot has a sane profile shape", () => {
    for (const bot of Object.values(BOTS)) {
      expect(bot.targetWpm).toBeGreaterThan(0);
      expect(bot.noiseWpm).toBeGreaterThanOrEqual(0);
      expect(bot.rampSeconds).toBeGreaterThan(0);
      expect(bot.accuracyTarget).toBeGreaterThan(0);
      expect(bot.accuracyTarget).toBeLessThanOrEqual(1);
      expect(bot.name).toMatch(/^@/);
    }
  });

  it("capacity is 1 + bot lineup length", () => {
    expect(capacityFor("1v3")).toBe(4);
    expect(capacityFor("1v1")).toBe(2);
    expect(capacityFor("sprint")).toBe(3);
    expect(capacityFor("endurance")).toBe(3);
  });

  it("unknown modes fall back to the selan lineup capacity", () => {
    expect(capacityFor("does-not-exist")).toBe(2);
  });

  it("instantBotWpm ramps up and stays within target ± noise", () => {
    const bot = BOTS.selan;
    const w0 = instantBotWpm(bot, 0, 42);
    const wFull = instantBotWpm(bot, bot.rampSeconds * 1000, 42);
    expect(w0).toBeLessThan(wFull + bot.noiseWpm);
    expect(wFull).toBeGreaterThan(bot.targetWpm - bot.noiseWpm - 1);
    expect(wFull).toBeLessThan(bot.targetWpm + bot.noiseWpm + 1);
  });

  it("is deterministic given the same race seed", () => {
    const a = instantBotWpm(BOTS.damiel, 1500, 1234);
    const b = instantBotWpm(BOTS.damiel, 1500, 1234);
    expect(a).toBe(b);
  });

  it("BOT_LINEUP covers every shipped mode id", () => {
    for (const mode of ["1v3", "1v1", "sprint", "endurance", "quote", "burst"]) {
      expect(BOT_LINEUP[mode]?.length).toBeGreaterThan(0);
    }
  });

  it("botMistakesChar respects accuracyTarget over many rolls", () => {
    // A 90%-accuracy bot should error on roughly 10% of chars across
    // a large sample. We only assert "in the right ballpark" — the
    // deterministic RNG makes the exact count repeatable but the
    // tuning intent is the rate, not any specific number.
    const bot = BOTS.yusuf; // 0.9
    let errors = 0;
    const N = 2000;
    for (let i = 0; i < N; i += 1) {
      if (botMistakesChar(bot, i, 7777)) errors += 1;
    }
    const rate = errors / N;
    expect(rate).toBeGreaterThan(0.05);
    expect(rate).toBeLessThan(0.15);
  });

  it("a perfect bot never mistakes", () => {
    const bot = { ...BOTS.damiel, accuracyTarget: 1 };
    for (let i = 0; i < 100; i += 1) {
      expect(botMistakesChar(bot, i, 42)).toBe(false);
    }
  });
});
