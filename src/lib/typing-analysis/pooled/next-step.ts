import type {
  BarrierKind,
  BarriersSection,
  BarrierVariant,
  Gate,
  NextStep,
  PracticeAction,
  TrendState,
} from "@/types/insights";

/** The one next step (spec-10 §13.10). A locked drill is never chosen,
 *  as the action or as an alternative. Drill ids are the catalogue's
 *  (src/app/drills/_components/drill-catalog.ts). */

export type Readiness = { weaknessReady: boolean; worstWordsReady: boolean };
export type Plan = { action: PracticeAction; alternatives: PracticeAction[] };

const MAX_ALTERNATIVES = 2;
const TEST: PracticeAction = { kind: "test" };
const drill = (drillId: string): PracticeAction => ({ kind: "drill", drillId });

/** Weakness needs a warm model with a weak pair; worst-words needs 5 slow
 *  words. Every other drill this module names is always ready. */
export function isReady(a: PracticeAction, r: Readiness): boolean {
  if (a.kind === "test") return true;
  if (a.drillId === "weakness") return r.weaknessReady;
  if (a.drillId === "worst-words") return r.worstWordsReady;
  return true;
}

const same = (a: PracticeAction, b: PracticeAction) =>
  a.kind === b.kind && (a.kind === "test" || a.drillId === (b as { drillId: string }).drillId);

function plan(action: PracticeAction, alternatives: readonly PracticeAction[], r: Readiness): Plan {
  const alts = alternatives.filter((a) => isReady(a, r) && !same(a, action));
  return { action, alternatives: alts.slice(0, MAX_ALTERNATIVES) };
}

/** The drill (or test) that addresses a barrier, with its alternatives. */
export function barrierPlan(kind: BarrierKind, variant: BarrierVariant, r: Readiness): Plan {
  if (kind === "fixing") {
    return variant === "frequency"
      ? plan(drill("tricky"), [drill("weakness"), drill("top-100-sprint")], r)
      : plan(TEST, [drill("tricky")], r);
  }
  if (kind === "before") {
    return variant === "longWords"
      ? plan(r.worstWordsReady ? drill("worst-words") : drill("top-100-sprint"), [drill("english-burst")], r)
      : plan(drill("top-100-sprint"), [drill("english-burst"), drill("burst-1000")], r);
  }
  const action = r.weaknessReady ? drill("weakness") : drill("trigram-burst");
  return plan(action, variant === "pair" ? [drill("trigram-burst")] : [drill("english-burst")], r);
}

const NO_BARRIER: Record<"levelled" | "improving" | "steady" | "slipping", PracticeAction[]> = {
  levelled: [drill("pangrams"), drill("english-burst")],
  improving: [drill("burst-1000")],
  steady: [drill("pangrams")],
  slipping: [drill("top-100-sprint")],
};

/** `barriers` is null when the analysis store is unavailable. */
export function nextStepOf(o: {
  barriers: BarriersSection | null; trend: TrendState; trendGate: Gate | null; readiness: Readiness; tests: number;
}): NextStep {
  const learning = (gate: Gate | null): NextStep => ({ kind: "learning", action: TEST, alternatives: [], gate });
  if (o.tests === 0) return learning({ have: 0, need: 10, unit: "tests" });
  const b = o.barriers;
  if (b?.status === "ready" && b.items.length > 0) {
    const top = b.items[0]!;
    const p = barrierPlan(top.kind, top.variant, o.readiness);
    return { kind: "barrier", barrier: top.kind, variant: top.variant, detail: top.detail, recent: top.recent,
      better: top.better, gain: top.gain, action: p.action, alternatives: p.alternatives };
  }
  if (b?.status === "learning") return learning(b.gate);
  // Barriers ready with none showing, or unavailable: the trend decides.
  if (o.trend === "early" && b === null) return learning(o.trendGate);
  const kind = o.trend === "early" ? "steady" : o.trend;
  return { kind, action: TEST, alternatives: plan(TEST, NO_BARRIER[kind], o.readiness).alternatives, gate: null };
}
