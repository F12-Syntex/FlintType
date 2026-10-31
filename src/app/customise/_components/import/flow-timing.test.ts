import { describe, expect, it } from "vitest";
import { applyStepMs, CHECK_STEP_MIN_MS, dwellLeft, STAGE_SETTLE_MS, timingFor } from "./flow-timing";

describe("flow timing", () => {
  it("shares about 1.2 s across the import steps, 120 to 240 ms each", () => {
    expect([applyStepMs(1), applyStepMs(5), applyStepMs(6), applyStepMs(10), applyStepMs(20)]).toEqual([240, 240, 200, 120, 120]);
    expect(applyStepMs(0)).toBe(0);
  });

  it("keeps the whole check under 1.5 s when the work is instant", () => {
    expect(3 * CHECK_STEP_MIN_MS + STAGE_SETTLE_MS).toBeLessThanOrEqual(1500);
  });

  it("never waits once the work took longer than the minimum", () => {
    expect(dwellLeft(360, 100)).toBe(260);
    expect(dwellLeft(360, 900)).toBe(0);
  });

  it("waits for nothing under reduced motion", () => {
    const t = timingFor(true);
    expect([t.checkStepMs, t.settleMs, t.applyStepMs(3)]).toEqual([0, 0, 0]);
    expect(timingFor(false).checkStepMs).toBe(CHECK_STEP_MIN_MS);
  });
});
