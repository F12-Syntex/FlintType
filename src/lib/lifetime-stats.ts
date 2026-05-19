/** Per-user lifetime counters that feed the XP/level economy beyond
 *  the test-row count. Stored in the user-prefs blob under
 *  `lifetimeStats`. Read by:
 *    - profile derive-stats: combines with testsCompleted into total XP
 *    - leaderboard Top by Level: same combination, server-side
 *
 *  Counters are monotonic-increment only — there is no reset
 *  affordance in the UI by design. Resetting would let a user farm
 *  XP, and the level number wants to be a record of cumulative
 *  effort, not a current-state value.
 *
 *  Pure (no React) — the React hook lives in `use-lifetime-stats.ts`
 *  so this module is safe to import server-side without dragging the
 *  use-remote-prefs / Clerk chain into the server bundle. */

export type LifetimeStats = {
  drillsCompleted: number;
  /** Number of races the user finished (reached the end of the
   *  passage). Reserved — not wired to a race-finish event yet. */
  racesFinished: number;
  /** Number of races finished in 1st place. Reserved — not wired
   *  yet. */
  racesWon: number;
};

export const DEFAULT_LIFETIME_STATS: LifetimeStats = {
  drillsCompleted: 0,
  racesFinished: 0,
  racesWon: 0,
};

/** Pure read of the slice from a parsed prefs blob — used server-side
 *  by the leaderboard route, where we already have the JSON in hand
 *  and don't want to mount React state. Tolerates missing / malformed
 *  shapes by falling back to defaults. */
export function readLifetimeStats(
  prefs: Record<string, unknown> | undefined | null,
): LifetimeStats {
  const slice = prefs?.lifetimeStats as Partial<LifetimeStats> | undefined;
  if (!slice || typeof slice !== "object") return DEFAULT_LIFETIME_STATS;
  return {
    drillsCompleted: numericFloor(slice.drillsCompleted),
    racesFinished: numericFloor(slice.racesFinished),
    racesWon: numericFloor(slice.racesWon),
  };
}

function numericFloor(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}
