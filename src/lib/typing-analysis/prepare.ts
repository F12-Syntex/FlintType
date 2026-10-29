import type { RunInput } from "@/types/typing-analysis";
import { boundaryUnits, computeBudget, episodeMask, type Budget } from "./budget";
import { replayEpisodes, type Episode } from "./episodes";
import { episodesV1 } from "./episodes-v1";
import { estimatePace, taintOf, thresholds, type PaceBase, type Thresholds } from "./pace";
import { buildTimeline, type Timeline } from "./timeline";

/** The per-test pipeline up to the time budget (spec-10 §10): timeline,
 *  one v2 replay (its integrity check and its episodes together, with a
 *  v1 fallback when it fails), pace, episodes, thresholds and budget.
 *  analyseRun builds everything else on this; the budget property tests
 *  read the same object. Expects `usableInput(input)` to hold. */

export type Prepared = {
  tl: Timeline;
  replayOk: boolean;
  /** Final buffers: the v2 replay, else the client's `typedFinal` (v1), else null. */
  buffers: readonly string[] | null;
  /** The v2 replay's word cursor at the end of the run; null for v1. */
  cursor: number | null;
  base: PaceBase;
  episodes: Episode[];
  inEp: Uint8Array;
  /** Null when there is no pace. */
  th: Thresholds | null;
  budget: Budget | null;
};

export function prepareRun(input: RunInput): Prepared {
  let tl = buildTimeline(input);
  let replayOk = true;
  let replayed: ReturnType<typeof replayEpisodes> | null = null;
  if (tl.capture === 2) {
    const rep = replayEpisodes(tl, input.words);
    if (rep.ok) replayed = rep;
    else {
      replayOk = false;
      tl = buildTimeline(input, { forceV1: true });
    }
  }
  const base = estimatePace(tl, taintOf(tl));
  const episodes = replayed ? replayed.episodes : episodesV1(tl, base.P);
  const inEp = episodeMask(tl, episodes);
  let th: Thresholds | null = null;
  let budget: Budget | null = null;
  if (base.P !== null) {
    th = thresholds(tl, { ...base, P: base.P }, boundaryUnits(tl, inEp));
    budget = computeBudget(tl, base, th, episodes, inEp, input.ctx?.race === true);
  }
  return {
    tl,
    replayOk,
    buffers: replayed ? replayed.typed : (input.typedFinal ?? null),
    cursor: replayed ? replayed.cursor : null,
    base,
    episodes,
    inEp,
    th,
    budget,
  };
}
