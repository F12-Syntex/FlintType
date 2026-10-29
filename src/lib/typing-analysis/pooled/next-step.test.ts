import { describe, expect, it } from "vitest";
import type { Barrier, BarrierKind, BarrierVariant, BarriersSection } from "@/types/insights";
import { barrierPlan, isReady, nextStepOf, type Readiness } from "./next-step";

const ALL: Readiness = { weaknessReady: true, worstWordsReady: true };
const NONE: Readiness = { weaknessReady: false, worstWordsReady: false };
const d = (id: string) => ({ kind: "drill" as const, drillId: id });
const TEST = { kind: "test" as const };

describe("barrierPlan", () => {
  const rows: [BarrierKind, BarrierVariant, ReturnType<typeof d> | typeof TEST, (ReturnType<typeof d> | typeof TEST)[]][] = [
    ["fixing", "frequency", d("tricky"), [d("weakness"), d("top-100-sprint")]],
    ["fixing", "cost", TEST, [d("tricky")]],
    ["before", "longWords", d("worst-words"), [d("english-burst")]],
    ["before", "flat", d("top-100-sprint"), [d("english-burst"), d("burst-1000")]],
    ["inside", "pair", d("weakness"), [d("trigram-burst")]],
    ["inside", "flat", d("weakness"), [d("english-burst")]],
  ];
  it.each(rows)("%s / %s", (kind, variant, action, alternatives) => {
    expect(barrierPlan(kind, variant, ALL)).toEqual({ action, alternatives });
  });
  it("a locked weakness drill falls back to trigram-burst (never twice)", () => {
    expect(barrierPlan("inside", "pair", NONE)).toEqual({ action: d("trigram-burst"), alternatives: [] });
    expect(barrierPlan("inside", "flat", NONE)).toEqual({ action: d("trigram-burst"), alternatives: [d("english-burst")] });
  });
  it("a locked worst-words drill falls back to top-100-sprint", () => {
    expect(barrierPlan("before", "longWords", NONE).action).toEqual(d("top-100-sprint"));
  });
  it("alternatives are ready drills only", () => {
    expect(barrierPlan("fixing", "frequency", NONE).alternatives).toEqual([d("top-100-sprint")]);
    expect(isReady(d("weakness"), NONE)).toBe(false);
    expect(isReady(TEST, NONE)).toBe(true);
    expect(isReady(d("pangrams"), NONE)).toBe(true);
  });
});

describe("nextStepOf", () => {
  const barrier: Barrier = {
    kind: "before", variant: "flat", recent: 6, better: 3, recoverable: { low: 1, high: 3 }, gain: { low: 1, high: 4 },
    detail: { pauseOneIn: [0.3, 0.15] }, action: d("top-100-sprint"),
  };
  const ready = (items: Barrier[]): BarriersSection => ({ status: "ready", items });
  it("takes the top barrier", () => {
    const s = nextStepOf({ barriers: ready([barrier]), trend: "steady", trendGate: null, readiness: ALL, tests: 20 });
    expect(s).toEqual({ kind: "barrier", barrier: "before", variant: "flat", detail: barrier.detail, recent: 6, better: 3,
      gain: barrier.gain, action: d("top-100-sprint"), alternatives: [d("english-burst"), d("burst-1000")] });
  });
  it.each([
    ["levelled", [d("pangrams"), d("english-burst")]],
    ["improving", [d("burst-1000")]],
    ["steady", [d("pangrams")]],
    ["slipping", [d("top-100-sprint")]],
  ] as const)("with no barrier, %s takes a test", (trend, alternatives) => {
    expect(nextStepOf({ barriers: ready([]), trend, trendGate: null, readiness: ALL, tests: 20 }))
      .toEqual({ kind: trend, action: TEST, alternatives, gate: null });
  });
  it("is learning while barriers are, or with no tests", () => {
    const gate = { have: 6, need: 10, unit: "tests" as const };
    expect(nextStepOf({ barriers: { status: "learning", gate }, trend: "early", trendGate: null, readiness: ALL, tests: 6 }))
      .toEqual({ kind: "learning", action: TEST, alternatives: [], gate });
    expect(nextStepOf({ barriers: null, trend: "early", trendGate: null, readiness: ALL, tests: 0 }))
      .toMatchObject({ kind: "learning", gate: { have: 0, need: 10 } });
  });
  it("without the analysis store, the trend decides (early is learning on its gate)", () => {
    const gate = { have: 9, need: 15, unit: "tests" as const };
    expect(nextStepOf({ barriers: null, trend: "early", trendGate: gate, readiness: ALL, tests: 9 })).toMatchObject({ kind: "learning", gate });
    expect(nextStepOf({ barriers: null, trend: "improving", trendGate: null, readiness: ALL, tests: 30 })).toMatchObject({ kind: "improving" });
  });
  it("barriers ready with none showing but an early trend counts as steady", () => {
    expect(nextStepOf({ barriers: ready([]), trend: "early", trendGate: null, readiness: ALL, tests: 12 })).toMatchObject({ kind: "steady" });
  });
});
