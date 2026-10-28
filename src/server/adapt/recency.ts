/** Word-level recency: words served recently are down-weighted so a
 *  passage doesn't keep repeating the same carriers. The persisted
 *  `adaptRecency` user-prefs slice maps word → tests ago.
 *
 *  Recency penalty multiplier: a word seen `testsAgo` tests back scales
 *  its score down on a curve that recovers to 1.0 over the recovery
 *  window. testsAgo = 0 means "in the test we just ran". */
export const RECENCY_FLOOR = 0.2;

/** How many tests a just-shown word stays penalised for (and how long
 *  the persisted recently-shown map keeps it — `advanceRecency` prunes
 *  on the same window, so the two never drift). Widened from 5 to 14
 *  so a word drilled this session doesn't resurface next session: with
 *  a small weak set the old window let the same handful of carriers
 *  recur every few tests. The floor (not a hard ban) still lets a weak
 *  word return if the pool genuinely can't avoid it. */
export const RECENCY_RECOVERY_TESTS = 14;

export function recencyMultiplier(testsAgo: number): number {
  if (testsAgo < 0) return 1;
  if (testsAgo >= RECENCY_RECOVERY_TESTS) return 1;
  const t = testsAgo / RECENCY_RECOVERY_TESTS;
  return RECENCY_FLOOR + (1 - RECENCY_FLOOR) * t;
}

/** Step the recently-shown map forward by one test: every existing
 *  entry's distance increases by 1, words from the just-served test
 *  are stamped at distance 0. Old entries past the recovery window
 *  are dropped to keep the map bounded. */
export function advanceRecency(
  prev: ReadonlyMap<string, number>,
  newWords: readonly string[],
  recoveryWindow: number,
): Map<string, number> {
  const next = new Map<string, number>();
  for (const [word, dist] of prev) {
    const aged = dist + 1;
    if (aged < recoveryWindow) next.set(word, aged);
  }
  for (const word of newWords) next.set(word, 0);
  return next;
}
