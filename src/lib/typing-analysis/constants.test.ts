import { describe, expect, it } from "vitest";
import { MIN_PACE_INTERVALS } from "@/lib/keystrokes/clean-pace";
import { MIN_INTERVAL_MS } from "@/lib/keystrokes/taint";
import * as C from "./constants";

describe("analysis constants", () => {
  it("P is the cross-hand and plain pace: their priors are 1", () => {
    expect(C.CLASS_PRIOR.cross).toBe(1);
    expect(C.CLASS_PRIOR.plain).toBe(1);
    for (const v of Object.values(C.CLASS_PRIOR)) expect(v).toBeGreaterThanOrEqual(1);
  });

  it("stay in step with the shared keystroke helpers", () => {
    expect(C.PACE_ROUGH_MIN).toBe(MIN_PACE_INTERVALS);
    expect(C.STATS_FLOOR_MS).toBe(MIN_INTERVAL_MS);
  });

  it("keep their documented relations", () => {
    expect(C.CATCH_MIN_FACTOR).toBeLessThan(C.CATCH_MAX_FACTOR);
    expect(C.BOUNDARY_CLAMP[0]).toBeLessThan(C.BOUNDARY_PRIOR);
    expect(C.BOUNDARY_PRIOR).toBeLessThan(C.BOUNDARY_CLAMP[1]);
    expect(C.CLASS_RATIO_CLAMP[0]).toBeLessThan(1);
    expect(C.DIGEST_TRACKED + C.DIGEST_FREQUENT).toBe(C.DIGEST_MAX_PAIRS);
    expect(C.BREAK_FLOOR_MS).toBe(2000);
    expect(C.RULE_VERSION).toBe(1);
  });
});
