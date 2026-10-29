import type { FingerId } from "@/lib/hand-layout";
import { fingerForChar } from "@/lib/keystrokes/key-map";
import { countChars } from "@/lib/wpm";
import type { AnalysisCells, GapClass, LogCell, RunAnalysis, RunLengthMode } from "@/types/typing-analysis";
import type { Budget } from "./budget";
import {
  CLASS_PRIOR,
  LENGTH_BANDS,
  RCV_MIN,
  STARTUP_MIN_KEYS,
  STARTUP_MIN_RUN_WORDS,
  STARTUP_RATIO,
  STARTUP_WORDS,
  WORD_FRICTION_KEYS,
} from "./constants";
import type { Episode } from "./episodes";
import type { PaceBase, Thresholds } from "./pace";
import { mad, round } from "./stats";
import { wordAt, type Timeline } from "./timeline";

/** Within-run measures built on the budget's units (spec-10 §8). The
 *  fade (§8.3) lives in fade.ts. */

/** Per word: before + inside + fixing (§8.1). Length-neutral: a long word
 *  typed fluently has none. */
export function frictionByWord(budget: Budget): Map<number, number> {
  const out = new Map<number, number>();
  for (const u of budget.units) {
    const f = u.before + u.inside + u.fixing;
    if (f > 0) out.set(u.word, (out.get(u.word) ?? 0) + f);
  }
  return out;
}

export function topFriction(friction: Map<number, number>, words: readonly string[], P: number): RunAnalysis["wordFriction"] {
  return [...friction]
    .filter(([, ms]) => ms >= WORD_FRICTION_KEYS * P)
    .sort((x, y) => y[1] - x[1] || x[0] - y[0])
    .slice(0, 3)
    .map(([w, ms]) => ({ word: wordAt(words, w), wordIndex: w, ms: Math.round(ms) }));
}

const band = (len: number) => (len <= LENGTH_BANDS[0] ? 0 : len <= LENGTH_BANDS[1] ? 1 : 2);
const pairKey = (tl: Timeline, k: number) => (tl.ev[k - 1]!.expected + tl.ev[k]!.expected).toLowerCase();

/** §8.2 plus the length bands of §7.4. */
export function pauseSummary(tl: Timeline, words: readonly string[], budget: Budget): RunAnalysis["pauses"] {
  const byLength: RunAnalysis["pauses"]["byLength"] = [[0, 0], [0, 0], [0, 0]];
  let ms = 0;
  let longest: { ms: number; word: string } | null = null;
  for (const u of budget.units) {
    if (u.kind !== "boundary") continue;
    const word = wordAt(words, tl.ev[u.k]!.wordIndex);
    const cell = byLength[band(word.length)];
    cell[0]++;
    if (!u.pause) continue;
    cell[1]++;
    ms += u.before;
    if (!longest || u.before > longest.ms) longest = { ms: u.before, word };
  }
  return { ms: Math.round(ms), byLength, longest: longest && { ms: Math.round(longest.ms), word: longest.word } };
}

export function catchSummary(tl: Timeline, words: readonly string[], budget: Budget): RunAnalysis["catches"] {
  const byWord = new Map<number, number>();
  const byPair = new Map<string, number>();
  let ms = 0;
  for (const u of budget.units) {
    if (!u.catch) continue;
    ms += u.inside;
    byWord.set(u.word, (byWord.get(u.word) ?? 0) + u.inside);
    const key = pairKey(tl, u.k);
    if (key.length === 2) byPair.set(key, (byPair.get(key) ?? 0) + 1);
  }
  let top: number | null = null;
  for (const [w, x] of byWord) if (top === null || x > byWord.get(top)! || (x === byWord.get(top)! && w < top)) top = w;
  const pairs = [...byPair].sort((x, y) => y[1] - x[1] || (x[0] < y[0] ? -1 : 1)).slice(0, 5);
  return { ms: Math.round(ms), topWord: top === null ? null : wordAt(words, top), pairs };
}

/** §8.4: the first four words cost far more than the rest. */
export function startUpOf(friction: Map<number, number>, wordsReached: number, P: number): RunAnalysis["startUp"] {
  if (wordsReached < STARTUP_MIN_RUN_WORDS) return null;
  let f4 = 0;
  let rest = 0;
  for (const [w, ms] of friction) {
    if (w < STARTUP_WORDS) f4 += ms;
    else if (w < wordsReached) rest += ms;
  }
  const fBar = rest / (wordsReached - STARTUP_WORDS);
  if (f4 < Math.max(STARTUP_MIN_KEYS * P, STARTUP_RATIO * STARTUP_WORDS * fBar)) return null;
  return { words: STARTUP_WORDS, ms: Math.round(f4 - STARTUP_WORDS * fBar) };
}

/** Fluent clean in-word gaps: in I and not catch-sized. */
function fluent(tl: Timeline, base: PaceBase, th: Thresholds): number[] {
  const out: number[] = [];
  for (let k = 1; k < tl.K; k++) if (base.inI[k] && tl.ds[k]! <= th.catchAt(k)) out.push(k);
  return out;
}

/** addToCell in place (these cells are built fresh per run). */
function bump(c: LogCell, x: number): void {
  if (!(x > 0) || !Number.isFinite(x)) return;
  const l = Math.log(x);
  c[0] += 1;
  c[1] += l;
  c[2] += l * l;
}

/** §7.4 cells. Classes and fingers keep the priors ρ⁰_c so they compare
 *  across runs; pairs hold every clean in-word gap. */
export function cellsOf(tl: Timeline, base: PaceBase, th: Thresholds): AnalysisCells {
  const cls: Partial<Record<GapClass, LogCell>> = {};
  const fin: Partial<Record<FingerId, LogCell>> = {};
  const pairs: Record<string, LogCell> = {};
  for (const k of fluent(tl, base, th)) {
    const c = base.cls[k]!;
    if (tl.qwerty) bump((cls[c] ??= [0, 0, 0]), tl.ds[k]!);
    const f = fingerForChar(tl.ev[k]!.expected);
    if (tl.qwerty && !tl.quantised && f) bump((fin[f] ??= [0, 0, 0]), tl.ds[k]! / (th.P * CLASS_PRIOR[c]));
  }
  for (let k = 1; k < tl.K; k++) {
    if (!base.inI[k]) continue;
    const key = pairKey(tl, k);
    if (key.length === 2) bump((pairs[key] ??= [0, 0, 0]), tl.ds[k]!);
  }
  return { cls, fin: tl.qwerty && !tl.quantised ? fin : null, pairs };
}

/** §8.5 rhythm coefficient of variation. */
export function rcvOf(tl: Timeline, base: PaceBase, th: Thresholds): number | null {
  if (tl.quantised) return null;
  const logs = fluent(tl, base, th).map((k) => Math.log(tl.ds[k]! / (th.P * CLASS_PRIOR[base.cls[k]!])));
  if (logs.length < RCV_MIN) return null;
  const s = 1.4826 * mad(logs);
  return round(Math.sqrt(Math.exp(s * s) - 1), 3);
}

/** §8.5 lost characters: exact from final buffers (v2 replay or v1
 *  `typedFinal`), else (server v1) each word with an unfixed slip. In a
 *  TIME run the last word reached is still in progress, unless the v2
 *  replay's end `cursor` is past it (the timer ran out right after the
 *  Space that committed it). */
export function lostOf(
  tl: Timeline,
  words: readonly string[],
  buffers: readonly string[] | null,
  lengthMode: RunLengthMode,
  episodes: readonly Episode[],
  cursor: number | null = null,
): { lostChars: number; left: number; lostWpm: number } {
  const n = tl.wordsReached;
  let lostChars = 0;
  let left = 0;
  if (buffers) {
    const tgt = Array.from({ length: n }, (_, i) => wordAt(words, i));
    const buf = tgt.map((_, i) => (typeof buffers[i] === "string" ? buffers[i]! : ""));
    const committed = (i: number) => i < n - 1 || lengthMode !== "time" || (cursor !== null && i < cursor);
    const fixedBuf = buf.map((b, i) => (committed(i) ? tgt[i]! : b));
    const C = (x: string[]) => {
      const cc = countChars(x, tgt, true);
      return cc.correctWordChars + cc.correctSpaces;
    };
    lostChars = Math.max(0, C(fixedBuf) - C(buf));
    left = buf.filter((b, i) => committed(i) && b !== tgt[i]).length;
  } else {
    const wrong = new Set(episodes.filter((e) => !e.fixed && e.kind !== "rewrite").map((e) => e.word));
    left = wrong.size;
    for (const w of wrong) lostChars += wordAt(words, w).length + 1;
  }
  return { lostChars, left, lostWpm: tl.T > 0 ? Math.round((12000 * lostChars) / tl.T) : 0 };
}
