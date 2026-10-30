import type { Finding, FixMode, RunAnalysis } from "@/types/typing-analysis";
import { LONG_WORDS_MIN_SHORT, MIN_IMPACT_KEYS, MIN_IMPACT_SHARE, SINGLE_PAUSE_FACTOR, WORST_WORD_SHARE } from "./constants";
import type { Episode } from "./episodes";
import { wordAt } from "./timeline";

/** Candidate findings, their impact in ms and the ranking (spec-10 §9).
 *  Every threshold is relative to the run: minImpact = max(4·P, 3% of T),
 *  so the same run at 45 wpm and at 220 wpm says the same things. */

export type FindingInputs = {
  P: number | null;
  T: number;
  wpm: number;
  /** Why there is no budget, if there isn't one. */
  gate: "ok" | "short" | "clock";
  quantised: boolean;
  fixMode: FixMode;
  mistakes: Pick<RunAnalysis["mistakes"], "count" | "fixed" | "rewrites" | "left" | "lostChars" | "lostWpm" | "canFix">;
  /** The fixing finding's time and its time per word index, from the
   *  episodes its count covers only (see fixedFixing). */
  fixed: FixedFixing;
  words: readonly string[];
  noticedLate: number | null;
  pauses: { count: number; ms: number; longest: RunAnalysis["pauses"]["longest"]; byLength: RunAnalysis["pauses"]["byLength"] };
  catches: { count: number; ms: number; topWord: string | null };
  breaks: { count: number; ms: number };
  fade: RunAnalysis["fade"];
  startUp: RunAnalysis["startUp"];
};

const TIE_ORDER: Finding["kind"][] = ["fixing", "left", "before", "inside", "fade", "startUp", "breaks"];

export type FixedFixing = { ms: number; byWord: Map<number, number> };

/** The fixing finding describes the fixed episodes only: fixed slips and
 *  extras, and rewrites typed again (its count, fixed + rewrites). Its
 *  time and its worst word come from the same episodes, so it never names
 *  a word only because of a mistake left unfixed there. (The word it names
 *  can still be left wrong by another mistake in it.) An unfixed episode's
 *  time stays in the Fixing slice but not in the finding. When no unfixed
 *  episode costs anything, ms is the slice itself, so the finding and the
 *  time table agree to the millisecond. */
export function fixedFixing(episodes: readonly Episode[], costs: readonly number[], fixingMs: number): FixedFixing {
  const byWord = new Map<number, number>();
  let fixed = 0;
  let unfixed = 0;
  episodes.forEach((e, i) => {
    const c = costs[i] ?? 0;
    if (!e.fixed) unfixed += c;
    else {
      fixed += c;
      byWord.set(e.word, (byWord.get(e.word) ?? 0) + c);
    }
  });
  return { ms: unfixed > 0 ? Math.min(fixingMs, Math.round(fixed)) : fixingMs, byWord };
}

function fixingFinding(x: FindingInputs, minImpact: number): Finding | null {
  const m = x.mistakes;
  const count = m.fixed + m.rewrites;
  const ms = Math.round(x.fixed.ms);
  if (x.fixMode === "none" || count < 1 || ms < minImpact) return null;
  let worstWord: string | null = null;
  const byWord = x.fixed.byWord;
  const total = [...byWord.values()].reduce((a, v) => a + v, 0);
  if (count >= 2 && total > 0) {
    let best = -1;
    for (const [w, t] of byWord) {
      const top = byWord.get(best) ?? -1;
      if (t > top || (t === top && w < best)) best = w;
    }
    // A word index past the passage (a TIME run ended after going back) has no word to name.
    if ((byWord.get(best) ?? 0) / total >= WORST_WORD_SHARE) worstWord = wordAt(x.words, best) || null;
  }
  return { kind: "fixing", impactMs: ms, ms, count, worstWord, noticedLate: x.noticedLate };
}

function leftFinding(x: FindingInputs): Finding | null {
  const m = x.mistakes;
  if (m.left < 1 || m.lostWpm < 1) return null;
  const C = (x.wpm * x.T) / 12000;
  const impactMs = C + m.lostChars > 0 ? x.T - (x.T * C) / (C + m.lostChars) : 0;
  return { kind: "left", impactMs: Math.round(impactMs), count: m.left, lostWpm: m.lostWpm, canFix: m.canFix };
}

/** Pause rate before long words (≥ 8) at least twice the rate before
 *  short ones (≤ 4), with at least 2 pauses in the long band and at least
 *  LONG_WORDS_MIN_SHORT boundaries into short words to compare against. */
function longWordsPause(bl: RunAnalysis["pauses"]["byLength"]): boolean {
  const [short, , long] = bl;
  if (long[1] < 2 || long[0] === 0 || short[0] < LONG_WORDS_MIN_SHORT) return false;
  return long[1] / long[0] >= (2 * short[1]) / short[0];
}

export function findingsFor(x: FindingInputs): Finding[] {
  if (x.P === null || x.gate === "short") return [{ kind: "short", impactMs: 0 }];
  const minImpact = Math.max(MIN_IMPACT_KEYS * x.P, MIN_IMPACT_SHARE * x.T);
  if (x.gate === "clock") {
    const rest = [fixingFinding(x, minImpact), leftFinding(x)].filter((f): f is Finding => f !== null);
    return [{ kind: "clock", impactMs: 0 }, ...rest];
  }
  const out: Finding[] = [];
  const push = (f: Finding | null) => f && out.push(f);
  push(fixingFinding(x, minImpact));
  push(leftFinding(x));
  const p = x.pauses;
  if ((p.count >= 2 || (p.count === 1 && p.ms >= SINGLE_PAUSE_FACTOR * minImpact)) && p.ms >= minImpact) {
    out.push({ kind: "before", impactMs: p.ms, ms: p.ms, count: p.count, longest: p.longest, longWords: longWordsPause(p.byLength) });
  }
  const c = x.catches;
  // Like pauses: one long stall counts on its own, at twice minImpact.
  if (!x.quantised && (c.count >= 2 || (c.count === 1 && c.ms >= SINGLE_PAUSE_FACTOR * minImpact)) && c.ms >= minImpact) {
    out.push({ kind: "inside", impactMs: c.ms, ms: c.ms, count: c.count, topWord: c.topWord });
  }
  if (x.breaks.count >= 1) out.push({ kind: "breaks", impactMs: x.breaks.ms, ms: x.breaks.ms, count: x.breaks.count });
  if (x.fade?.significant) {
    const { fromWpm, toWpm, lastSeconds } = x.fade;
    const drop = fromWpm > 0 ? Math.max(0, (fromWpm - toWpm) / fromWpm) : 0;
    out.push({ kind: "fade", impactMs: Math.round(drop * lastSeconds * 1000), fromWpm, toWpm, lastSeconds });
  }
  if (x.startUp) out.push({ kind: "startUp", impactMs: x.startUp.ms, words: x.startUp.words, ms: x.startUp.ms });
  out.sort((a, b) => b.impactMs - a.impactMs || TIE_ORDER.indexOf(a.kind) - TIE_ORDER.indexOf(b.kind));
  if (out.length === 0) return [{ kind: "even", impactMs: 0, mistakes: x.mistakes.count }];
  return out.slice(0, 3);
}
