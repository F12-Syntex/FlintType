import { describe, expect, it } from "vitest";
import { bannedPatterns } from "@/lib/copy-rules";
import type { Barrier, BarrierKind, BarrierVariant } from "@/types/insights";
import {
  BARRIERS_EMPTY,
  barrierCoaching,
  barrierEvidence,
  barrierGain,
  barriersLearning,
  barriersMethod,
  barrierTitle,
  barrierTrackLabel,
  NEXT_STEP_ROW,
} from "./barrier-copy";
import { testKindOf } from "./copy-phrases";

const kind = testKindOf({
  key: "casual|time|60", mode: "casual", lengthMode: "time", length: 60, touch: false,
  tests: 40, analysed: 40, lastAtMs: 0,
});

function barrier(k: BarrierKind, variant: BarrierVariant, o: Partial<Barrier> = {}): Barrier {
  return {
    kind: k, variant, recent: 4.5, better: 1.2, recoverable: { low: 2, high: 4 }, gain: { low: 3, high: 5 },
    detail: {}, action: null, ...o,
  };
}

describe("barrier rows", () => {
  it("states the evidence against better days", () => {
    const b = barrier("before", "flat");
    expect(barrierTitle(b)).toBe("Pauses before words");
    expect(barrierEvidence(b)).toBe("About 4.5 seconds of every minute now. On your better days, about 1.2 seconds.");
    expect(barrierEvidence(barrier("before", "flat", { better: 0.3 }))).toBe(
      "About 4.5 seconds of every minute now. On your better days, under half a second.",
    );
    expect(barrierTrackLabel(b)).toBe("Recently 4.5 seconds a minute, better days 1.2 seconds a minute.");
    expect(barrierGain(b, "wpm")).toBe("Worth about 3 to 5 wpm.");
  });
  it("has one coaching line per variant", () => {
    expect(barrierCoaching(barrier("fixing", "frequency", { detail: { perMin: [1.5, 0.8] } }))).toBe(
      "More mistakes than in the tests before: about 1.5 a minute, up from 0.8.",
    );
    expect(barrierCoaching(barrier("fixing", "frequency", { detail: { perMin: [1.2, 0] } }))).toBe(
      "More mistakes than in the tests before: about 1.2 a minute, up from almost none.",
    );
    expect(barrierCoaching(barrier("fixing", "frequency"))).toBe("More mistakes than in the tests before.");
    expect(barrierCoaching(barrier("before", "longWords"))).toBe("Longer words make you pause more often.");
    expect(barrierCoaching(barrier("before", "flat"))).toBe("Spread across all kinds of words.");
    expect(barrierCoaching(barrier("inside", "pair", { detail: { pair: "th" } }))).toBe("Especially at “th”.");
    expect(barrierCoaching(barrier("inside", "flat"))).toBe("Spread across many words.");
  });
  it("calls fixes slower only when each one costs more than usual", () => {
    const cost = (costKeys?: [number, number]) => barrierCoaching(barrier("fixing", "cost", { detail: costKeys ? { costKeys } : {} }));
    expect(cost([6, 4])).toBe("Each mistake takes longer to fix than it usually does.");
    expect(cost([13, 13])).toBe("Each fix takes about as long as usual.");
    expect(cost([3, 5])).toBe("Each fix takes less time than usual.");
    expect(cost()).toBe("Fixing takes more of each minute than on your better days.");
  });
  it("counts up while learning", () => {
    expect(barriersLearning({ have: 6, need: 10, unit: "tests" }, kind)).toBe(
      "After 4 more Casual tests of 60 seconds we can rank what would help most.",
    );
  });
  it("passes the copy rules in every branch", () => {
    const all: [BarrierKind, BarrierVariant][] = [
      ["fixing", "frequency"], ["fixing", "cost"], ["before", "longWords"], ["before", "flat"], ["inside", "pair"], ["inside", "flat"],
    ];
    const strings = [BARRIERS_EMPTY, NEXT_STEP_ROW, ...barriersMethod(kind), barriersLearning({ have: 9, need: 10, unit: "tests" }, kind)];
    for (const [k, v] of all) {
      for (const recent of [0.2, 4.5, 15]) {
        for (const detail of [{ perMin: [2, 1] as [number, number], pair: "in" }, { perMin: [2, 0] as [number, number], costKeys: [4, 4] as [number, number] }, {}]) {
          const b = barrier(k, v, { recent, better: recent / 4, detail, gain: { low: 0, high: recent } });
          strings.push(barrierEvidence(b), barrierCoaching(b), barrierGain(b, "wpm"), barrierTrackLabel(b));
          expect(barrierCoaching(b)).not.toMatch(/\bfrom 0\b/);
        }
        const b = barrier(k, v, { recent });
        expect(bannedPatterns(barrierTitle(b), { heading: true })).toEqual([]);
      }
    }
    for (const s of strings) expect(bannedPatterns(s), s).toEqual([]);
  });
});
