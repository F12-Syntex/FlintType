import { V2_POS_MISMATCH_MAX } from "./constants";
import type { Mark, Timeline } from "./timeline";

/** v2 buffer replay and its integrity check (spec-10 §6.1). The replay
 *  walks the merged timeline exactly as the practice reducer applied it:
 *  per-word buffers, a cursor (w, len) with len === buf[w].length, and
 *  the reducer's rule that a stop-on-error (or sudden-death) wrong key
 *  changes nothing. Each check that fails counts a mismatch and the
 *  cursor resyncs to the record, so one bad record can't cascade. A
 *  record can only resync to a word the Space marks can reach (index ≤
 *  their count), so a hostile word index can't make the buffers grow.
 *
 *  Every step is O(1) or O(log K): buffers are arrays of code units (a
 *  key or a Backspace on a long buffer never copies it) and a Fenwick
 *  tree over `alive` answers `aliveIn` for the episodes' `needed`. */

export type ReplayStep = { kind: "char"; k: number } | { kind: "mark"; at: number; mark: Mark };

export type ReplayState = {
  /** Per-word buffers, one code unit per entry. */
  buf: string[][];
  /** The char event index behind each buffer character. */
  idx: number[][];
  w: number;
  /** Per char event: currently in a buffer (appended, not popped or wiped). */
  alive: Uint8Array;
  /** Fenwick tree over `alive` (1-based). */
  tree: Int32Array;
  /** The reducer's typed.length: words given a slot by a key or a Space. */
  slots: number;
  /** The furthest word the run can reach: its number of Space marks. */
  maxW: number;
  mismatches: number;
};

/** marks[0], ev[0], marks[1], ev[1], … marks[K]. */
export function replayOrder(tl: Timeline): ReplayStep[] {
  const out: ReplayStep[] = [];
  for (let k = 0; k <= tl.K; k++) {
    for (const mark of tl.marks[k]!) out.push({ kind: "mark", at: k, mark });
    if (k < tl.K) out.push({ kind: "char", k });
  }
  return out;
}

export function newReplay(tl: Timeline): ReplayState {
  let spaces = 0;
  for (const list of tl.marks) for (const m of list) if (m.kind === "space") spaces++;
  return { buf: [], idx: [], w: 0, alive: new Uint8Array(tl.K), tree: new Int32Array(tl.K + 1), slots: 0, maxW: spaces, mismatches: 0 };
}

export const lenOf = (st: ReplayState, w: number): number => st.buf[w]?.length ?? 0;
export const bufOf = (st: ReplayState, w: number): string => (st.buf[w] ?? []).join("");

/** buf[w] is a prefix of `target`: O(target length), whatever the buffer's length. */
export function prefixOf(st: ReplayState, w: number, target: string): boolean {
  const b = st.buf[w];
  if (!b) return true;
  if (b.length > target.length) return false;
  for (let i = 0; i < b.length; i++) if (b[i] !== target[i]) return false;
  return true;
}

function setAlive(st: ReplayState, k: number, v: 0 | 1): void {
  if (st.alive[k] === v) return;
  st.alive[k] = v;
  const d = v === 1 ? 1 : -1;
  for (let i = k + 1; i < st.tree.length; i += i & -i) st.tree[i] = st.tree[i]! + d;
}

function aliveBefore(st: ReplayState, n: number): number {
  let s = 0;
  for (let i = n; i > 0; i -= i & -i) s += st.tree[i]!;
  return s;
}

/** Char events with index in [lo, hi] currently alive, in O(log K). */
export function aliveIn(st: ReplayState, lo: number, hi: number): number {
  const a = Math.max(0, lo);
  const b = Math.min(hi, st.alive.length - 1);
  return b < a ? 0 : aliveBefore(st, b + 1) - aliveBefore(st, a);
}

function wipe(st: ReplayState, w: number): void {
  for (const k of st.idx[w] ?? []) setAlive(st, k, 0);
  st.buf[w] = [];
  st.idx[w] = [];
}

/** A word the cursor may resync to. */
const reachable = (st: ReplayState, w: unknown): w is number =>
  typeof w === "number" && Number.isInteger(w) && w >= 0 && w <= st.maxW;

/** Applies one record to the replay state. */
export function applyStep(st: ReplayState, tl: Timeline, step: ReplayStep): void {
  if (step.kind === "char") {
    const e = tl.ev[step.k]!;
    if (e.wordIndex !== st.w || e.pos !== lenOf(st, st.w)) {
      st.mismatches++;
      if (reachable(st, e.wordIndex)) st.w = e.wordIndex;
    }
    if (tl.fixMode === "block" && !e.correct) return;
    const b = (st.buf[st.w] ??= []);
    for (let i = 0; i < e.typed.length; i++) b.push(e.typed[i]!);
    (st.idx[st.w] ??= []).push(step.k);
    setAlive(st, step.k, 1);
    st.slots = Math.max(st.slots, st.w + 1);
    return;
  }
  const m = step.mark;
  if (m.kind === "space") {
    if (m.s.wordIndex !== st.w || m.s.pos !== lenOf(st, st.w)) {
      st.mismatches++;
      if (reachable(st, m.s.wordIndex)) st.w = m.s.wordIndex;
    }
    st.slots = Math.max(st.slots, st.w + 1);
    if (st.w < st.maxW) st.w += 1;
    else st.mismatches++;
    return;
  }
  const e = m.e;
  if (e.wordIndex !== st.w || e.pos !== lenOf(st, st.w)) st.mismatches++;
  if (e.cross === true) {
    if (st.w < 1) {
      st.mismatches++;
      return;
    }
    st.w -= 1;
    if (e.kind === "backWord") wipe(st, st.w);
    return;
  }
  if (e.kind === "backWord") {
    wipe(st, st.w);
    return;
  }
  const b = st.buf[st.w];
  if (!b || b.length < 1) {
    st.mismatches++;
    return;
  }
  b.pop();
  const k = st.idx[st.w]?.pop();
  if (k !== undefined) setAlive(st, k, 0);
}

/** Final buffers, exactly as the reducer's `typed`. */
export function typedOf(st: ReplayState): string[] {
  return Array.from({ length: st.slots }, (_, w) => bufOf(st, w));
}

export function replayRun(
  tl: Timeline,
  _words: readonly string[],
): { typed: string[]; mismatches: number; steps: ReplayStep[]; ok: boolean } {
  const steps = replayOrder(tl);
  const st = newReplay(tl);
  for (const step of steps) applyStep(st, tl, step);
  const records = steps.length;
  return {
    typed: typedOf(st),
    mismatches: st.mismatches,
    steps,
    ok: st.mismatches / Math.max(1, records) <= V2_POS_MISMATCH_MAX,
  };
}
