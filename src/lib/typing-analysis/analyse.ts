import type { RunAnalysis, RunInput } from "@/types/typing-analysis";
import { perMinuteOf } from "./budget";
import { LIVE_EVENTS_CAP, MIN_KEYS, PARTIAL_HEAD_SHARE } from "./constants";
import type { Episode } from "./episodes";
import { fadeOf } from "./fade";
import { findingsFor } from "./findings";
import { jackknifeSE } from "./jackknife";
import { prepareRun } from "./prepare";
import { median, round } from "./stats";
import { usableInput } from "./timeline";
import * as W from "./within-run";

/** analyseRun: the per-test orchestrator (spec-10 §10). Pure; the result
 *  screen and adapt.submit run it on the same input. It never throws
 *  (I8): unusable input (see usableInput), and anything unexpected,
 *  yields null. */
export function analyseRun(input: RunInput): RunAnalysis | null {
  if (!usableInput(input)) return null;
  try {
    return analyse(input);
  } catch {
    return null;
  }
}

const medianOrNull = (xs: number[], dp: number) => (xs.length > 0 ? round(median(xs), dp) : null);

function analyse(input: RunInput): RunAnalysis {
  const words = input.words;
  const { tl, replayOk, buffers, cursor, base, episodes, th, budget } = prepareRun(input);
  const P = base.P;
  const gate = P === null || tl.K < MIN_KEYS ? "short" : budget && !budget.clockOk ? "clock" : "ok";
  const ok = gate === "ok" && budget !== null && th !== null && P !== null;
  const slices = ok ? budget!.slices : null;
  const T = tl.T;

  const friction = ok ? W.frictionByWord(budget!) : new Map<number, number>();
  const pauses = ok ? W.pauseSummary(tl, words, budget!) : { ms: 0, byLength: [[0, 0], [0, 0], [0, 0]] as RunAnalysis["pauses"]["byLength"], longest: null };
  const catches = ok ? W.catchSummary(tl, words, budget!) : { ms: 0, topWord: null, pairs: [] };
  const fade = ok ? fadeOf(tl, budget!) : null;
  const startUp = ok ? W.startUpOf(friction, tl.wordsReached, P!) : null;
  const lost = W.lostOf(tl, words, buffers, input.lengthMode, episodes, cursor);

  const isMistake = (e: Episode) => e.kind !== "rewrite";
  const fixedSlips = episodes.filter((e) => e.kind === "slip" && e.fixed);
  const costs = budget ? budget.episodeCost : [];
  const fixingByWord = new Map<number, number>();
  episodes.forEach((e, i) => fixingByWord.set(e.word, (fixingByWord.get(e.word) ?? 0) + (costs[i] ?? 0)));
  const mistakes: RunAnalysis["mistakes"] = {
    count: episodes.filter(isMistake).length,
    fixed: episodes.filter((e) => isMistake(e) && e.fixed).length,
    // Only rewrites that were typed again: a rewrite left incomplete is a
    // word left wrong, as an unfixed slip is (its time stays in fixing).
    rewrites: episodes.filter((e) => e.kind === "rewrite" && e.fixed).length,
    left: lost.left,
    extras: episodes.filter((e) => e.kind === "extra").length,
    fixingMs: slices ? slices.fixing : 0,
    medianCostMs: budget ? medianOrNull(episodes.flatMap((e, i) => (isMistake(e) && e.fixed ? [costs[i]!] : [])), 0) : null,
    detectMs: medianOrNull(fixedSlips.flatMap((e) => (e.latencyMs === undefined ? [] : [e.latencyMs])), 0),
    noticeKeys: medianOrNull(fixedSlips.flatMap((e) => (e.noticeKeys === undefined ? [] : [e.noticeKeys])), 1),
    lostChars: lost.lostChars,
    lostWpm: lost.lostWpm,
    canFix: input.ctx?.confidence !== "all",
    fixMode: tl.fixMode,
  };
  const breaks = { ms: ok ? Math.round(budget!.breaksMs) : 0, count: ok ? budget!.breaksCount : 0 };
  const partial = input.partial === true
    || (tl.capture === 1 && (tl.K >= LIVE_EVENTS_CAP
      || (tl.head > PARTIAL_HEAD_SHARE * T && tl.head > Math.max(2000, 20 * (P ?? 0)))));

  const findings = findingsFor({
    P, T, wpm: input.wpm, gate, quantised: tl.quantised, fixMode: tl.fixMode, mistakes, fixingByWord, words,
    noticedLate: tl.capture === 2 ? fixedSlips.filter((e) => (e.noticeKeys ?? 0) >= 1).length : null,
    pauses: { count: ok ? budget!.pauses : 0, ...pauses },
    catches: { count: ok ? budget!.catches : 0, ms: catches.ms, topWord: catches.topWord },
    breaks, fade, startUp,
  });

  return {
    v: 1,
    quality: { capture: tl.capture, replayOk, pace: base.quality, quantised: tl.quantised, clockOk: budget?.clockOk ?? true, partial, qwerty: tl.qwerty },
    T,
    headMs: Math.round(tl.head),
    slices,
    perMinute: slices ? perMinuteOf(slices, T) : null,
    pace: th && P !== null
      ? { P: round(P, 1), sigma: round(base.sigma, 3), catchFactor: round(th.catchFactor, 2), boundaryMs: round(th.boundaryMs, 1),
          pauseFactor: round(th.pauseFactor, 2), breakMs: Math.round(th.beta), intervals: base.intervals }
      : null,
    counts: {
      keys: tl.K, words: tl.wordsReached,
      boundaries: ok ? budget!.boundaries : 0, pauses: ok ? budget!.pauses : 0,
      inWord: ok ? budget!.inWord : 0, catches: ok ? budget!.catches : 0, breaks: breaks.count,
    },
    mistakes,
    pauses,
    catches,
    breaks,
    inWordShare: ok && T > 0 ? round(budget!.inWordNeed / T, 3) : null,
    flowWpm: slices && slices.typing >= 0.2 * T && slices.typing > 0 ? round((input.wpm * T) / slices.typing, 1) : null,
    fade,
    startUp,
    wordFriction: ok ? W.topFriction(friction, words, P!) : [],
    se: ok ? jackknifeSE(budget!, T) : null,
    rcv: ok ? W.rcvOf(tl, base, th!) : null,
    cells: ok ? W.cellsOf(tl, base, th!) : { cls: {}, fin: null, pairs: {} },
    findings,
  };
}
