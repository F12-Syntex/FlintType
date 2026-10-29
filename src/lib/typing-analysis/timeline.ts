import type { EditTiming, KeystrokeTimingV2, SpaceTiming } from "@/types/capture";
import type { FixMode, InputKind, RunInput, RunLengthMode } from "@/types/typing-analysis";
import {
  MAX_DURATION_MS,
  MAX_WORD_INDEX,
  QUANT_MIN_GAPS,
  QUANT_SHARE,
  QUANT_STEPS_MS,
  QUANT_TOL_MS,
  STATS_FLOOR_MS,
} from "./constants";
import { fixModeOf, inputKindOf, isQwertyKeyboard } from "./context";

/** The run as one merged timeline (spec-10 §4.2): capture version, the
 *  edit and space marks placed between char events, the two clocks and
 *  quantisation. `t` (Date.now) is the only clock for T, the head, the
 *  tail and allocation; `ht` (event.timeStamp) is used for gap
 *  statistics only. */

export type Mark = { kind: "space"; s: SpaceTiming } | { kind: "edit"; e: EditTiming };

export type Timeline = {
  ev: readonly KeystrokeTimingV2[];
  K: number;
  T: number;
  /** dt[k] = t[k] − t[k−1] for k ≥ 1 (raw; may be negative). */
  dt: Float64Array;
  /** The statistics clock: ht gaps when usable, else dt. */
  ds: Float64Array;
  /** marks[k], k = 0..K: marks after ev[k−1] and before ev[k], in seq order. */
  marks: readonly Mark[][];
  capture: 1 | 2;
  useHt: boolean;
  quantised: boolean;
  input: InputKind;
  qwerty: boolean;
  fixMode: FixMode;
  head: number;
  tail: number;
  firstKeySpace: boolean;
  wordsReached: number;
  lengthMode: RunLengthMode;
};

const isInt = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x);
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

/** The target word, or "" when the payload doesn't carry it. */
export function wordAt(words: readonly string[], i: number): string {
  const w = words[i];
  return typeof w === "string" ? w : "";
}

/** Input the engine can use: a duration of at most a day, and char
 *  events with a finite clock, a bounded word index and their strings.
 *  Every exported entry point checks this first, so a hostile payload
 *  (the live clone, or a schema-valid submit) can't make the work grow
 *  beyond its array lengths. */
export function usableInput(input: RunInput): boolean {
  if (!input || !Array.isArray(input.timings) || input.timings.length === 0 || !Array.isArray(input.words)) return false;
  if (!isNum(input.durationMs) || input.durationMs <= 0 || input.durationMs > MAX_DURATION_MS || !isNum(input.wpm)) return false;
  return input.timings.every(
    (e) => !!e && isNum(e.t) && isInt(e.wordIndex) && e.wordIndex >= 0 && e.wordIndex <= MAX_WORD_INDEX
      && typeof e.expected === "string" && typeof e.typed === "string" && typeof e.correct === "boolean",
  );
}

function marksValid(list: readonly (EditTiming | SpaceTiming)[], K: number, seen: Set<number>): boolean {
  let prevAt = -1;
  let prevSeq = -1;
  for (const m of list) {
    if (!m || !isInt(m.at) || !isInt(m.seq) || !isInt(m.wordIndex) || !isInt(m.pos) || !isNum(m.t)) return false;
    if (m.at < 0 || m.at > K || seen.has(m.seq)) return false;
    // Sorting by (at, seq) must keep the array in its recorded order.
    if (m.at < prevAt || (m.at === prevAt && m.seq < prevSeq)) return false;
    seen.add(m.seq);
    prevAt = m.at;
    prevSeq = m.seq;
  }
  return true;
}

function isV2(input: RunInput): boolean {
  const { edits, spaces, timings } = input;
  if (input.ctx?.capped === true) return false;
  if (!Array.isArray(edits) || !Array.isArray(spaces)) return false;
  if (!timings.every((e) => isInt(e.pos) && e.pos >= 0)) return false;
  const seen = new Set<number>();
  return marksValid(edits, timings.length, seen) && marksValid(spaces, timings.length, seen);
}

function nearGrid(g: number): boolean {
  for (const step of QUANT_STEPS_MS) {
    const r = ((g % step) + step) % step;
    if (Math.min(r, step - r) <= QUANT_TOL_MS) return true;
  }
  return false;
}

/** Share of candidate gaps sitting on a privacy-hardened timer grid, or
 *  null when there are too few candidates to judge. */
function gridShare(cands: readonly number[], gapOf: (k: number) => number): number | null {
  if (cands.length < QUANT_MIN_GAPS) return null;
  let on = 0;
  for (const k of cands) if (nearGrid(gapOf(k))) on++;
  return on / cands.length;
}

export function buildTimeline(input: RunInput, opts: { forceV1?: boolean } = {}): Timeline {
  const ev = input.timings;
  const K = ev.length;
  const T = Math.round(input.durationMs);
  const capture: 1 | 2 = !opts.forceV1 && isV2(input) ? 2 : 1;

  const dt = new Float64Array(K);
  for (let k = 1; k < K; k++) dt[k] = ev[k]!.t - ev[k - 1]!.t;

  const marks: Mark[][] = Array.from({ length: K + 1 }, () => []);
  if (capture === 2) {
    const all: { at: number; seq: number; m: Mark }[] = [];
    for (const s of input.spaces!) all.push({ at: s.at, seq: s.seq, m: { kind: "space", s } });
    for (const e of input.edits!) all.push({ at: e.at, seq: e.seq, m: { kind: "edit", e } });
    all.sort((x, y) => x.at - y.at || x.seq - y.seq);
    for (const x of all) marks[x.at]!.push(x.m);
  }

  // Quantisation candidates: same-word correct → correct gaps of 25 ms or more.
  const cands: number[] = [];
  for (let k = 1; k < K; k++) {
    const a = ev[k - 1]!;
    const b = ev[k]!;
    if (a.wordIndex === b.wordIndex && a.correct && b.correct && dt[k]! >= STATS_FLOOR_MS) cands.push(k);
  }
  let htOk = capture === 2 && K > 0 && ev.every((e) => isNum(e.ht));
  for (let k = 1; htOk && k < K; k++) if (ev[k]!.ht! < ev[k - 1]!.ht!) htOk = false;
  let useHt = htOk;
  let share: number | null = null;
  if (htOk) {
    share = gridShare(cands, (k) => ev[k]!.ht! - ev[k - 1]!.ht!);
    if (share !== null && share > QUANT_SHARE) useHt = false;
  }
  if (!useHt) share = gridShare(cands, (k) => dt[k]!);
  const quantised = share !== null && share > QUANT_SHARE;

  const ds = new Float64Array(K);
  for (let k = 1; k < K; k++) ds[k] = useHt ? ev[k]!.ht! - ev[k - 1]!.ht! : dt[k]!;

  const ctx = input.ctx;
  const inputKind: InputKind = ctx?.input ?? (capture === 2 ? inputKindOf(ev) : "keyboard");
  let maxW = -1;
  for (const e of ev) maxW = Math.max(maxW, e.wordIndex);
  for (const list of marks) for (const m of list) maxW = Math.max(maxW, m.kind === "space" ? m.s.wordIndex : m.e.wordIndex);
  const firstKeySpace =
    capture === 2
      ? marks[0]!.some((m) => m.kind === "space")
      : K > 0 && ev[0]!.wordIndex >= 1 && ev[0]!.t > 0;

  return {
    ev,
    K,
    T,
    dt,
    ds,
    marks,
    capture,
    useHt,
    quantised,
    input: inputKind,
    qwerty: isQwertyKeyboard(ctx, inputKind),
    fixMode: fixModeOf(ctx),
    head: K > 0 ? Math.max(0, ev[0]!.t) : 0,
    tail: K > 0 ? Math.max(0, T - ev[K - 1]!.t) : 0,
    firstKeySpace,
    wordsReached: Math.max(0, Math.min(input.words.length, maxW + 1)),
    lengthMode: input.lengthMode,
  };
}
