import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import type { BarrierDetail, BarrierVariant, NextStep } from "@/types/insights";
import { testKindOf } from "./copy-phrases";
import { nextStepBecause, nextStepTitle } from "./next-step-copy";

/** The fixing barrier's next step. The server sends "cost" whenever the
 *  mistake rate test does not pass, so the copy may call fixing slower
 *  only when each fix really costs more than usual. */

const kind = testKindOf({
  key: "training|words|25", mode: "training", lengthMode: "words", length: 25, touch: false,
  tests: 20, analysed: 20, lastAtMs: 0,
});
const TAIL = "Fix it the moment you feel it, and delete only the wrong letters.";
const PER_MINUTE = `Fixing mistakes takes you about 4.5 seconds of every minute, against 1.2 seconds on your better days. ${TAIL}`;

function fixing(variant: BarrierVariant, detail: BarrierDetail = {}): NextStep {
  return {
    kind: "barrier", barrier: "fixing", variant, detail, recent: 4.5, better: 1.2, gain: { low: 3, high: 5 },
    action: { kind: "drill", drillId: "tricky" }, alternatives: [],
  };
}

describe("fixing: more mistakes", () => {
  it("compares the mistake rate with the tests before", () => {
    const f = fixing("frequency", { perMin: [1.5, 0.8] });
    expect(nextStepTitle(f)).toBe("Make fewer mistakes");
    expect(nextStepBecause(f, kind)).toBe(
      "You're making about 1.5 mistakes a minute, up from 0.8 in the tests before. Fixing them takes about 4.5 seconds of every minute.",
    );
  });
  it("never prints a zero figure after an error-free stretch", () => {
    expect(nextStepBecause(fixing("frequency", { perMin: [1.2, 0] }), kind)).toBe(
      "You're making about 1.2 mistakes a minute, up from almost none in the tests before. Fixing them takes about 4.5 seconds of every minute.",
    );
    expect(nextStepBecause(fixing("frequency", { perMin: [1, 0.04] }), kind)).toMatch(/^You're making about 1 mistake a minute, up from almost none/);
  });
});

describe("fixing: time per mistake", () => {
  it("says fixes got slower only when they did", () => {
    const c = fixing("cost", { costKeys: [6, 4] });
    expect(nextStepTitle(c)).toBe("Fix mistakes faster");
    expect(nextStepBecause(c, kind)).toBe(
      `Each mistake takes you about as long as typing 6 letters to fix, against typing 4 letters usually. ${TAIL}`,
    );
  });
  it("uses the per-minute figures when each fix is no slower, or unknown", () => {
    for (const detail of [{ costKeys: [13, 13] as [number, number] }, { costKeys: [3, 5] as [number, number] }, {}]) {
      const c = fixing("cost", detail);
      expect(nextStepTitle(c)).toBe("Spend less time fixing mistakes");
      const because = nextStepBecause(c, kind);
      expect(because).toBe(PER_MINUTE);
      expect(because).not.toMatch(/to fix,|usually|faster/);
    }
  });
  it("passes the copy rules in every branch", () => {
    const details: BarrierDetail[] = [{}, { costKeys: [6, 4] }, { costKeys: [4, 4] }, { costKeys: [3, 5] }, { perMin: [2, 0] }, { perMin: [2, 1] }];
    for (const v of ["frequency", "cost"] as const) {
      for (const d of details) {
        for (const recent of [0.2, 4.5, 30]) {
          const s = { ...fixing(v, d), recent, better: recent / 3 } as NextStep;
          expect(bannedPatterns(nextStepTitle(s), { heading: true })).toEqual([]);
          const because = nextStepBecause(s, kind);
          expect(bannedPatterns(because), because).toEqual([]);
          expect(because).not.toMatch(/\babout 0\b|\bfrom 0\b/);
        }
      }
    }
  });
});
