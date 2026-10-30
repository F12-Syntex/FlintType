import { V2_POS_MISMATCH_MAX } from "./constants";
import { neededCounter } from "./needed";
import { applyStep, lenOf, newReplay, prefixOf, replayOrder, typedOf } from "./replay";
import { wordAt, type Timeline } from "./timeline";

/** Mistake episodes. An episode is a disjoint char-index span (a, b]
 *  (gap indices a+1 … b) from the key before a mistake until you are
 *  back on track (spec-10 §6). */
export type Episode = {
  a: number;
  b: number;
  word: number;
  kind: "slip" | "extra" | "rewrite";
  fixed: boolean;
  needed: number;
  /** v2: char events between the wrong key and the first edit (fixed slips). */
  noticeKeys?: number;
  /** v2: t(first edit) − t(wrong key) (fixed slips). */
  latencyMs?: number;
};

type Open = { a: number; word: number; kind: Episode["kind"]; errPos: number; lenBefore: number; j: number };
/** `i` is the episode's index in `closed`; it is stale once truncated.
 *  `inner`: an unfixed rewrite's inner slips, restored if it is reopened. */
type Closed = Episode & { errPos: number; lenBefore: number; j: number; i: number; inner?: Inner };
/** Slips and extras typed inside an open rewrite, in its own word, by the
 *  usual slip rules. Used when the rewrite ends without being typed again:
 *  the run ends on it (TIME), or an edit crosses back out of its word. */
type Inner = { open: Open | null; fixed: { o: Open; b: number; needed: number }[] };

/** The slip or extra that wrong key k opens. */
function slipAt(tl: Timeline, k: number): Open {
  const e = tl.ev[k]!;
  return { a: k - 1, word: e.wordIndex, kind: e.expected === "" ? "extra" : "slip", errPos: e.pos ?? 0, lenBefore: 0, j: k };
}

/** v2 episodes from the exact replay (§6.2). */
export function episodesV2(tl: Timeline, words: readonly string[]): Episode[] {
  return replayEpisodes(tl, words).episodes;
}

export type ReplayedEpisodes = {
  episodes: Episode[];
  /** Final buffers, exactly as the reducer's `typed`. */
  typed: string[];
  /** The word cursor at the end of the run. */
  cursor: number;
  mismatches: number;
  /** The replay passed its integrity check (as replayRun's `ok`). */
  ok: boolean;
};

/** One replay of the run that yields both the episodes and the integrity
 *  check, so analyseRun walks the timeline once. Every step is O(log K)
 *  amortised, so a schema-valid payload can't make the work quadratic
 *  (a reopened episode can close again on every edit). */
export function replayEpisodes(tl: Timeline, words: readonly string[]): ReplayedEpisodes {
  const st = newReplay(tl);
  const steps = replayOrder(tl);
  const needed = neededCounter(tl, st);
  const closed: Closed[] = [];
  /** Indices in `closed` of the slip and extra episodes, ascending. */
  const mistakesAt: number[] = [];
  /** Per word, its last unfixed episode. */
  const lastUnfixed = new Map<number, Closed>();
  const edits: { at: number; t: number }[] = [];
  for (let k = 0; k <= tl.K; k++) for (const m of tl.marks[k]!) if (m.kind === "edit") edits.push({ at: k, t: m.e.t });
  let open: Open | null = null;
  let inner: Inner = { open: null, fixed: [] };

  const correctPrefix = (w: number) => prefixOf(st, w, wordAt(words, w));
  /** Typed in full and correct. */
  const finished = (w: number) => lenOf(st, w) === wordAt(words, w).length && correctPrefix(w);
  /** The last word of a TIME run, still under the cursor: never "left" (as lostOf). */
  const inProgress = (w: number) => tl.lengthMode === "time" && w >= tl.wordsReached - 1 && w >= st.w;

  const close = (o: Open, b: number, fixed: boolean, n = needed(o.a, b)) => {
    // An empty span (a rewrite cut off by the next word's slip) holds no time and no keys.
    if (b <= o.a) return;
    const c: Closed = { ...o, b, fixed, needed: n, ...notice(tl, edits, o, b, fixed), i: closed.length };
    // `inner` is replaced, never changed, once its rewrite closes, so the
    // reference is a snapshot (and O(1), however often it is reopened).
    if (o.kind === "rewrite" && !fixed) c.inner = inner;
    closed.push(c);
    if (c.kind !== "rewrite") mistakesAt.push(c.i);
    if (!fixed) lastUnfixed.set(o.word, c);
  };

  const closeCheck = (o: Open, k: number): "fixed" | "unfixed" | null => {
    const e = tl.ev[k]!;
    if (e.wordIndex === o.word) {
      if (!e.correct || !correctPrefix(o.word)) return null;
      const len = lenOf(st, o.word);
      if (o.kind === "rewrite") return len >= o.lenBefore ? "fixed" : null;
      return len >= Math.min(o.errPos + 1, wordAt(words, o.word).length) ? "fixed" : null;
    }
    // Moving on fixes it only when the word was typed in full, so a fixed
    // mistake is never also a word left wrong (v1's "left the word").
    if (e.wordIndex > o.word) return finished(o.word) ? "fixed" : "unfixed";
    return null;
  };

  /** The episode an edit into word w reopens (going back to fix it): w's
   *  last unfixed episode, still recorded, with no slip or extra closed
   *  after it, while w isn't typed in full. O(1). */
  const reopenable = (w: number): Closed | null => {
    const E = lastUnfixed.get(w);
    if (!E || closed[E.i] !== E || finished(w)) return null;
    const last = mistakesAt.length > 0 ? mistakesAt[mistakesAt.length - 1]! : -1;
    return last <= E.i ? E : null;
  };

  /** Key k in the open rewrite's own word (`needed` is taken at the close). */
  const trackInner = (k: number) => {
    if (inner.open === null) {
      if (!tl.ev[k]!.correct) inner.open = slipAt(tl, k);
    } else if (closeCheck(inner.open, k) === "fixed") {
      inner.fixed.push({ o: inner.open, b: k, needed: needed(inner.open.a, k) });
      inner.open = null;
    }
  };

  /** The open rewrite ends without being typed again, so it is no episode,
   *  and the slips and extras typed in its word count as they would without
   *  it: fixed ones close on their fixing key, and one still open carries on
   *  as the open episode. (Nothing else closes while a rewrite is open, so
   *  `closed` keeps its timeline order.) */
  const dropRewrite = (): Open | null => {
    for (const f of inner.fixed) close(f.o, f.b, true, f.needed);
    const carried = inner.open;
    inner = { open: null, fixed: [] };
    return carried;
  };

  for (const step of steps) {
    if (step.kind === "mark") {
      if (step.mark.kind === "edit") {
        const e = step.mark.e;
        const w2 = e.cross === true ? st.w - 1 : st.w;
        // Crossing back out of an open rewrite's word: its deleted text was
        // not typed again, so it ends here, and the earlier word's keys are
        // read as usual (as they would be without it).
        if (open?.kind === "rewrite" && w2 < open.word) open = dropRewrite();
        if (w2 >= 0) {
          const lenBefore = lenOf(st, w2);
          const removes = e.kind === "backWord" ? lenBefore : e.cross === true ? 0 : Math.min(1, lenBefore);
          const E: Closed | null = open === null || open.kind === "rewrite" ? reopenable(w2) : null;
          if (E) {
            // Reopen E, merging any rewrite since its close.
            closed.length = E.i;
            while (mistakesAt.length > 0 && mistakesAt[mistakesAt.length - 1]! >= E.i) mistakesAt.pop();
            open = { a: E.a, word: E.word, kind: E.kind, errPos: E.errPos, lenBefore: E.lenBefore, j: E.j };
            // A reopened rewrite keeps the keys typed in its word before you moved on.
            inner = E.inner ?? { open: null, fixed: [] };
          } else if (open === null && removes >= 1 && correctPrefix(w2)) {
            open = { a: step.at - 1, word: w2, kind: "rewrite", errPos: 0, lenBefore, j: -1 };
            inner = { open: null, fixed: [] };
          }
        }
      }
      applyStep(st, tl, step);
      continue;
    }
    const k = step.k;
    const e = tl.ev[k]!;
    applyStep(st, tl, step);
    if (open) {
      const res = closeCheck(open, k);
      if (res === null) {
        if (open.kind === "rewrite" && e.wordIndex === open.word) trackInner(k);
        continue;
      }
      // A wrong key in a later word starts the next episode, so the
      // current one closes on the gap before it (spans stay disjoint).
      const startsNext = !e.correct && e.wordIndex !== open.word;
      close(open, startsNext ? k - 1 : k, res === "fixed");
      open = null;
      if (!startsNext) continue;
    }
    if (!e.correct) open = slipAt(tl, k);
  }
  // The last word of a TIME run, still being typed: a rewrite there counts
  // only once the deleted text is typed again (and then it has closed on
  // that key). Otherwise it is dropped, and the rest of its time follows
  // the gap and tail rules.
  if (open?.kind === "rewrite" && inProgress(open.word) && !(correctPrefix(open.word) && lenOf(st, open.word) >= open.lenBefore)) {
    open = dropRewrite();
  }
  if (open) {
    const w = open.word;
    if (finished(w) || (inProgress(w) && correctPrefix(w))) close(open, tl.K, true);
    else close(open, tl.K - 1, false);
  }
  return {
    episodes: closed.map(({ errPos: _e, lenBefore: _l, j: _j, i: _i, inner: _n, ...ep }) => ep),
    typed: typedOf(st),
    cursor: st.w,
    mismatches: st.mismatches,
    ok: st.mismatches / Math.max(1, steps.length) <= V2_POS_MISMATCH_MAX,
  };
}

/** Notice timing for a fixed slip: the first edit after the wrong key, if
 *  it came before the close. A blocked slip has no edit, so neither. */
function notice(
  tl: Timeline,
  edits: readonly { at: number; t: number }[],
  o: Open,
  b: number,
  fixed: boolean,
): Pick<Episode, "noticeKeys" | "latencyMs"> {
  if (!fixed || o.kind !== "slip" || o.j < 0) return {};
  // edits are in timeline order: binary search the first with at > j.
  let lo = 0;
  let hi = edits.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (edits[mid]!.at > o.j) hi = mid;
    else lo = mid + 1;
  }
  const first = edits[lo];
  if (!first || first.at > b) return {};
  return { noticeKeys: first.at - 1 - o.j, latencyMs: first.t - tl.ev[o.j]!.t };
}
