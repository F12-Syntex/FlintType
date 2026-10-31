import type {
  InsightsOverviewOutput,
  PatternRow,
  SpeedHeadline,
  TestSummaryRow,
  TimeSection,
} from "@/types/insights";
import type { FrictionKey, TestDigestV1 } from "@/types/typing-analysis";
import { median } from "../stats";
import { insightsOptions } from "./all-adapt";
import { barriersOf } from "./barriers";
import { changeCandidates, changesSection } from "./changes";
import { difficultyAdjustment, valueOf } from "./difficulty";
import { habitsOf } from "./habits";
import { minuteOf } from "./minute";
import { nextStepOf, type Readiness } from "./next-step";
import { plateauOf } from "./plateau";
import { sessionSignals } from "./sessions";
import { trendOf, trendSeries, type FrictionMove } from "./trend";
import { usualRange } from "./usual";
import {
  chooseBucket,
  defaultBucket,
  eligible,
  fixKeyOf,
  listedBuckets,
  toPooled,
  windowsFor,
  type AnalysisIndex,
} from "./windows";

/** The /insights overview (spec-10 §13.11, spec-30 §5): composes every
 *  pooled model for one bucket. Pure; the route passes `nowMs`. */

export type PatternInput = { pairs: PatternRow[]; words: PatternRow[]; cold: boolean; weakPairs: number; weakWords: number };

const DAY = 86_400_000;
const FRICTION: readonly string[] = ["fixing", "before", "inside"];
const NOT_READY = { status: "not-ready" } as const;

function readinessOf(p: PatternInput): Readiness {
  return { weaknessReady: !p.cold && p.weakPairs >= 1, worstWordsReady: p.weakWords >= 5 };
}

function emptyOverview(p: PatternInput): InsightsOverviewOutput {
  const r = readinessOf(p);
  return {
    status: "empty", buckets: [], bucket: null, headline: null,
    nextStep: nextStepOf({ barriers: null, trend: "early", trendGate: null, readiness: r, tests: 0 }),
    time: { status: "learning", last: null, gate: { have: 0, need: 5, unit: "tests" } },
    barriers: { status: "learning", gate: { have: 0, need: 10, unit: "tests" } },
    changes: { status: "learning", gate: { have: 0, need: 15, unit: "tests" } },
    series: null, habits: null,
    practice: { pairs: p.pairs, words: p.words, ...r },
    progress: { tests: 0, analysed: 0, sessions: 0, sessionsWithTwo: 0, spanDays: 0 },
    cold: p.cold,
  };
}

export function assembleOverview(data: {
  rows: TestSummaryRow[]; index: AnalysisIndex; digests: Map<string, TestDigestV1> | "unavailable";
  patterns: PatternInput; nowMs: number; bucket?: string;
}): InsightsOverviewOutput {
  const available = data.digests !== "unavailable";
  const pooled = toPooled(data.rows, data.index, available ? (data.digests as Map<string, TestDigestV1>) : new Map());
  const options = insightsOptions(pooled, data.nowMs);
  const chosen = chooseBucket(options, data.nowMs, data.bucket);
  if (!chosen || !pooled.some(eligible)) return emptyOverview(data.patterns);
  const readiness = readinessOf(data.patterns);
  const w = windowsFor(pooled, chosen);
  const adj = difficultyAdjustment(w);
  const fixKey = fixKeyOf(w);
  const usualValues = w.usual.map((t) => valueOf(adj, t));
  const W = median(usualValues);

  const cands = changeCandidates(w, adj, fixKey, available);
  const friction: FrictionMove[] = cands
    .filter((c) => FRICTION.includes(c.kind))
    .map((c) => ({ kind: c.kind as FrictionKey, direction: c.direction, before: c.before, after: c.after }));
  const trend = trendOf(w, adj, { plateau: plateauOf(w, adj), friction, W });
  const headline: SpeedHeadline = {
    usual: Math.round(W), range: usualRange(usualValues), last: Math.round(valueOf(adj, w.tests[0]!)),
    adjusted: adj.adjusted, trend,
  };

  const minute = available ? minuteOf(w, fixKey) : null;
  const barriers = !minute ? null : minute.status === "ready"
    ? barriersOf(w, { fixKey, better: minute.betterRaw, fixingSuppressed: minute.fixingSuppressed, W, readiness })
    : { section: { status: "learning" as const, gate: { have: w.usualD.length, need: 10, unit: "tests" as const } }, whatIf: null };
  const nextStep = nextStepOf({ barriers: barriers?.section ?? null, trend: trend.state, trendGate: trend.gate, readiness, tests: w.tests.length });
  const time: TimeSection = !minute ? NOT_READY : minute.status === "learning" ? minute : {
    status: "ready", recent: minute.recent, better: minute.better, tests: minute.tests, flowWpm: minute.flowWpm,
    whatIf: barriers?.whatIf ?? null, keysPerSecond: minute.keysPerSecond, catchFactor: minute.catchFactor,
    breakMs: minute.breakMs, focus: nextStep.kind === "barrier" ? nextStep.barrier : null, coarse: minute.coarse,
    fixMode: minute.fixMode,
  };

  const signals = sessionSignals(pooled, W);
  const listed = listedBuckets(options, [defaultBucket(options, data.nowMs), chosen]);
  return {
    status: available ? "ready" : "not-ready",
    buckets: listed,
    bucket: options.find((o) => o.key === chosen) ?? null,
    headline,
    nextStep,
    time,
    barriers: barriers?.section ?? NOT_READY,
    changes: available ? changesSection(w, cands, trend.state) : NOT_READY,
    series: trendSeries(w.tests, adj),
    habits: habitsOf({ usualD: available ? w.usualD : null, fixKey, warmUp: signals.warmUp, fatigue: signals.fatigue }),
    practice: { pairs: data.patterns.pairs, words: data.patterns.words, ...readiness },
    progress: {
      tests: w.tests.length,
      analysed: w.tests.filter((t) => t.indexed || t.digest !== null).length,
      sessions: new Set(w.tests.map((t) => t.session)).size,
      sessionsWithTwo: signals.sessionsWithTwo,
      spanDays: Math.floor((w.tests[0]!.startedAtMs - w.tests[w.tests.length - 1]!.startedAtMs) / DAY),
    },
    cold: data.patterns.cold,
  };
}
