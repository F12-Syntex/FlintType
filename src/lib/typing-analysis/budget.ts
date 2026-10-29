import { SLICE_ORDER, type SliceKey, type SliceSet } from "@/types/typing-analysis";
import { CLOCK_TOL_MS, CLOCK_TOL_SHARE } from "./constants";
import type { Episode } from "./episodes";
import { gapKind, type GapKind } from "./gaps";
import type { PaceBase, Thresholds } from "./pace";
import { largestRemainder } from "./stats";
import type { Timeline } from "./timeline";

/** The exact five-slice time budget (spec-10 §7): every unit of the run
 *  (the head, each gap, each mistake episode, the tail) is split between
 *  typing, fixing, before, inside and breaks, so the slices add up to T.
 *
 *  Breaks holds only what its clause says: the excess of a unit of β or
 *  more (a gap, a non-race head, the tail, also inside a fix) and the
 *  whole wait for a race gun. Every other unit below β is typing unless it
 *  is a catch, a pause or part of a mistake. */

export type UnitKind = "head" | "tail" | "episode" | "episodeBreak" | GapKind;

export type Unit = SliceSet & {
  kind: UnitKind;
  /** Gap index (0 for the head, K for the tail, the closing b for an episode). */
  k: number;
  /** The word the unit is attributed to (§7.4). */
  word: number;
  need: number;
  pause: boolean;
  catch: boolean;
  brk: boolean;
};

export type Budget = {
  /** Reconciled float slices, Σ = T. */
  S: SliceSet;
  /** Integer ms in SLICE_ORDER, Σ = T exactly. */
  slices: SliceSet;
  R: number;
  clockOk: boolean;
  tookFromBreaks: boolean;
  units: Unit[];
  raceHead: number;
  breaksMs: number;
  breaksCount: number;
  episodeCost: number[];
  inEpisode: Uint8Array;
  boundaries: number;
  inWord: number;
  pauses: number;
  catches: number;
  inWordNeed: number;
};

const zero = (): SliceSet => ({ typing: 0, fixing: 0, before: 0, inside: 0, breaks: 0 });

/** Gap k belongs to episode e when e.a < k ≤ e.b (never gap 0). */
export function episodeMask(tl: Timeline, episodes: readonly Episode[]): Uint8Array {
  const m = new Uint8Array(tl.K + 1);
  for (const e of episodes) for (let k = Math.max(1, e.a + 1); k <= Math.min(e.b, tl.K - 1); k++) m[k] = 1;
  return m;
}

/** Boundary gaps outside every episode: the units P_B is estimated from. */
export function boundaryUnits(tl: Timeline, inEpisode: Uint8Array): number[] {
  const out: number[] = [];
  for (let k = 1; k < tl.K; k++) if (!inEpisode[k] && gapKind(tl, k) === "boundary") out.push(k);
  return out;
}

export function computeBudget(
  tl: Timeline,
  base: PaceBase,
  th: Thresholds,
  episodes: readonly Episode[],
  inEpisode: Uint8Array,
  race: boolean,
): Budget {
  const { K, ev, T } = tl;
  const { P, beta } = th;
  const S = zero();
  const units: Unit[] = [];
  let breaksMs = 0;
  let breaksCount = 0;
  const add = (u: Partial<SliceSet> & Pick<Unit, "kind" | "k" | "word"> & Partial<Unit>) => {
    const full: Unit = {
      typing: u.typing ?? 0, fixing: u.fixing ?? 0, before: u.before ?? 0, inside: u.inside ?? 0, breaks: u.breaks ?? 0,
      kind: u.kind, k: u.k, word: u.word, need: u.need ?? 0, pause: u.pause ?? false, catch: u.catch ?? false, brk: u.brk ?? false,
    };
    S.typing += full.typing;
    S.fixing += full.fixing;
    S.before += full.before;
    S.inside += full.inside;
    S.breaks += full.breaks;
    if (full.brk) {
      breaksMs += full.breaks;
      breaksCount++;
    }
    units.push(full);
  };
  const lastWord = ev[K - 1]!.wordIndex;

  // The head (J1): the wait for a race gun is always a break.
  const head = tl.head;
  const raceHead = race ? head : 0;
  if (race) add({ kind: "head", k: 0, word: ev[0]!.wordIndex, breaks: head });
  else if (head >= beta) add({ kind: "head", k: 0, word: ev[0]!.wordIndex, typing: P, breaks: head - P, brk: true });
  else add({ kind: "head", k: 0, word: ev[0]!.wordIndex, typing: head });

  const episodeCost: number[] = [];
  let tailTaken = false;
  for (const e of episodes) {
    let Te = 0;
    for (let k = Math.max(1, e.a + 1); k <= Math.min(e.b, K - 1); k++) {
      const d = Math.max(0, tl.dt[k]!);
      if (d >= beta) {
        // A break inside a fix is still a break.
        add({ kind: "episodeBreak", k, word: e.word, breaks: d - P, brk: true });
        Te += P;
      } else Te += d;
    }
    if (e.b === K) {
      tailTaken = true;
      if (tl.tail >= beta) {
        add({ kind: "episodeBreak", k: K, word: e.word, breaks: tl.tail - P, brk: true });
        Te += P;
      } else Te += tl.tail;
    }
    const cost = Math.max(0, Te - e.needed * P);
    episodeCost.push(cost);
    add({ kind: "episode", k: Math.min(e.b, K), word: e.word, typing: Te - cost, fixing: cost });
  }

  let boundaries = 0;
  let inWord = 0;
  let pauses = 0;
  let catches = 0;
  let inWordNeed = 0;
  for (let k = 1; k < K; k++) {
    if (inEpisode[k]) continue;
    const kind = gapKind(tl, k);
    const d = Math.max(0, tl.dt[k]!);
    const word = ev[k]!.wordIndex;
    const need = kind === "inWord" ? th.needIn(k) : kind === "boundary" ? th.needB(k) : kind === "other" ? P : d;
    if (kind === "boundary") boundaries++;
    if (kind === "inWord") inWordNeed += need;
    if (base.inI[k]) inWord++;
    if (kind === "chunk") add({ kind, k, word, need, typing: d });
    else if (d >= beta) add({ kind, k, word, need, typing: need, breaks: d - need, brk: true });
    else if (kind === "inWord" && base.inI[k] && !tl.quantised && tl.ds[k]! > th.catchAt(k)) {
      const x = Math.max(0, d - need);
      add({ kind, k, word, need, typing: d - x, inside: x, catch: true });
      catches++;
    } else if (kind === "boundary" && tl.ds[k]! > th.pauseAt(k)) {
      const x = Math.max(0, d - need);
      add({ kind, k, word, need, typing: d - x, before: x, pause: true });
      pauses++;
    } else add({ kind, k, word, need, typing: d });
  }

  if (!tailTaken) {
    if (tl.tail >= beta) add({ kind: "tail", k: K, word: lastWord, typing: P, breaks: tl.tail - P, brk: true });
    else add({ kind: "tail", k: K, word: lastWord, typing: tl.tail });
  }

  // Reconcile: a positive residue is clock noise and goes to typing; a
  // negative one (a backwards clock step) is taken from typing first.
  const R = T - SLICE_ORDER.reduce((s, x) => s + S[x], 0);
  let tookFromBreaks = false;
  if (R > 0) S.typing += R;
  else if (R < 0) {
    let take = -R;
    for (const x of ["typing", "breaks", "inside", "before", "fixing"] as SliceKey[]) {
      const t = Math.min(S[x], take);
      if (t > 0 && x === "breaks") tookFromBreaks = true;
      S[x] -= t;
      take -= t;
    }
  }
  const clockOk = Math.abs(R) <= Math.max(CLOCK_TOL_MS, CLOCK_TOL_SHARE * T);
  const ints = largestRemainder(SLICE_ORDER.map((x) => S[x]), T, 0);
  const slices = zero();
  SLICE_ORDER.forEach((x, i) => (slices[x] = ints[i]!));
  return {
    S, slices, R, clockOk, tookFromBreaks, units, raceHead, breaksMs, breaksCount, episodeCost,
    inEpisode, boundaries, inWord, pauses, catches, inWordNeed,
  };
}

/** Seconds per minute, one decimal, summing to 60.0. */
export function perMinuteOf(slices: SliceSet, T: number): SliceSet {
  const v = largestRemainder(SLICE_ORDER.map((x) => (T > 0 ? (slices[x] * 60) / T : 0)), 60, 1);
  const out = zero();
  SLICE_ORDER.forEach((x, i) => (out[x] = v[i]!));
  return out;
}
