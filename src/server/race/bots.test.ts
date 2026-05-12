import { describe, expect, it } from "vitest";
import { BOT_LINEUP, BOTS, capacityFor, instantBotWpm } from "./bots";

describe("race/bots", () => {
  it("damiel/selan/kassia profiles are present and ordered by skill", () => {
    expect(BOTS.damiel.targetWpm).toBeGreaterThan(BOTS.selan.targetWpm);
    expect(BOTS.selan.targetWpm).toBeGreaterThan(BOTS.kassia.targetWpm);
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
    // At t=0 the bot sits around half-target; at full ramp it should
    // be close to its target (within noise band).
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
    for (const mode of ["1v3", "1v1", "sprint", "endurance", "burst"]) {
      expect(BOT_LINEUP[mode]?.length).toBeGreaterThan(0);
    }
  });
});
