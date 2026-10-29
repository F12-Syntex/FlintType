import { aliveIn, type ReplayState } from "./replay";
import type { Timeline } from "./timeline";

/** `needed` for an episode span (a, b] (spec-10 §6.2): the span's char
 *  events still alive at the close, plus its space marks that no cross
 *  edit inside the span undid (a final Space in marks[K] counts when
 *  b = K). Each query is O(log K), because a reopened episode closes
 *  again on every detour and a scan per close would be quadratic.
 *
 *  - Alive chars come from the replay's Fenwick tree (`aliveIn`), so the
 *    count is taken at the moment of the close.
 *  - The space count is a walk over the span's marks in timeline order
 *    (+1 a Space, −1 a cross edit while above 0). With S the prefix sums
 *    of ±1 over all marks, the walk from `begin` to `end` ends at
 *    S[end] − min S[begin..end] (a walk reflected at 0), which a min
 *    segment tree over S answers. */
export type NeededFn = (a: number, b: number) => number;

export function neededCounter(tl: Timeline, st: ReplayState): NeededFn {
  const K = tl.K;
  // start[g]: index of the first mark of gap g in timeline order.
  const start = new Int32Array(K + 2);
  let M = 0;
  for (let g = 0; g <= K; g++) {
    start[g] = M;
    M += tl.marks[g]!.length;
  }
  start[K + 1] = M;
  const n = M + 1;
  const S = new Int32Array(n);
  let i = 0;
  for (let g = 0; g <= K; g++) {
    for (const m of tl.marks[g]!) {
      S[i + 1] = S[i]! + (m.kind === "space" ? 1 : m.e.cross === true ? -1 : 0);
      i++;
    }
  }
  const seg = new Int32Array(2 * n);
  seg.set(S, n);
  for (let j = n - 1; j >= 1; j--) seg[j] = Math.min(seg[2 * j]!, seg[2 * j + 1]!);
  /** min S[l..r], inclusive. */
  const minIn = (l: number, r: number): number => {
    let out = Infinity;
    for (let lo = l + n, hi = r + n + 1; lo < hi; lo >>= 1, hi >>= 1) {
      if (lo & 1) out = Math.min(out, seg[lo++]!);
      if (hi & 1) out = Math.min(out, seg[--hi]!);
    }
    return out;
  };
  return (a, b) => {
    const lo = Math.max(0, a + 1);
    const alive = aliveIn(st, lo, Math.min(b, K - 1));
    const hi = Math.min(b, K);
    if (hi < lo) return alive;
    const begin = start[lo]!;
    const end = start[hi + 1]!;
    return alive + S[end]! - minIn(begin, end);
  };
}
