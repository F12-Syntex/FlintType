/** Shared XP / level economy. ONE source of truth for the level
 *  number a user sees on their profile hero, in the leaderboard's
 *  Top-by-Level view, on notifications, anywhere.
 *
 *  Economy is deliberately simple + visible:
 *    - Every level costs XP_PER_LEVEL.
 *    - XP rewards per action live in `src/lib/xp-rewards.ts`. Today:
 *        completed test  = 100 XP    (10 tests / level)
 *        completed drill = 250 XP    (~4 drills / level)
 *        race finish     = 50 XP
 *        race win        = +150 XP   (5 wins / level on top of finish)
 *    - The progress bar moves a fixed amount per action; the level
 *      number is one ahead of the floor (level 1 at zero XP).
 *
 *  Pure — no I/O, no React. Used by:
 *    src/app/profile/_components/derive-stats.ts
 *    src/server/routes/leaderboard/index.ts (Top by Level route)
 *    src/app/leaderboard/_components/user-views.tsx
 *
 *  When changing the formula, change it here. Do not duplicate. */

export const XP_PER_TEST = 100;
export const XP_PER_LEVEL = 1000;

export type LevelStats = {
  level: number;
  /** Lifetime XP across every reward event. */
  totalXp: number;
  /** XP earned inside the current level, 0..XP_PER_LEVEL-1. */
  xpIntoLevel: number;
  /** Fraction of progress into the current level, 0..1. */
  progress: number;
};

export function levelFromXp(totalXp: number): LevelStats {
  const safe = Math.max(0, Math.floor(totalXp));
  const level = Math.floor(safe / XP_PER_LEVEL) + 1;
  const xpIntoLevel = safe % XP_PER_LEVEL;
  const progress = xpIntoLevel / XP_PER_LEVEL;
  return { level, totalXp: safe, xpIntoLevel, progress };
}

/** Backwards-compat shim — every call site that only knows about
 *  tests can use this. Callers that need drill / race XP route
 *  through `computeTotalXp` + `levelFromXp` directly. */
export function levelFromTestsCompleted(
  testsCompleted: number,
): LevelStats {
  return levelFromXp(Math.max(0, Math.floor(testsCompleted)) * XP_PER_TEST);
}
