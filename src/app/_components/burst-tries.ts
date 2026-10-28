import type { BurstTry } from "./burst-stats";

/** Each passage's burst tries, keyed by its words array. The try log
 *  (burst-log.tsx) appends here, and readers outside the log's subtree
 *  read here: the live broadcaster is mounted beside the typing surface,
 *  not inside it, and can't import the log's React module without closing
 *  an import cycle with practice-state. Weak, so a passage's tries go
 *  away with its words. Display only; bursts are never saved. */
const byPassage = new WeakMap<readonly string[], readonly BurstTry[]>();

export const NO_TRIES: readonly BurstTry[] = [];

/** Add a try to a passage's log and return the passage's tries so far. */
export function appendBurstTry(
  words: readonly string[],
  t: BurstTry,
): readonly BurstTry[] {
  const next = [...(byPassage.get(words) ?? NO_TRIES), t];
  byPassage.set(words, next);
  return next;
}

/** A passage's tries so far, oldest first (empty when none). */
export function burstTriesFor(words: readonly string[]): readonly BurstTry[] {
  return byPassage.get(words) ?? NO_TRIES;
}
