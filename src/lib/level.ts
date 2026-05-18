/** Shared XP / level economy. ONE source of truth for the level
 *  number a user sees on their profile hero, in the leaderboard's
 *  Top-by-Level view, on notifications, anywhere.
 *
 *  Economy is deliberately simple + visible:
 *    - Every completed test grants XP_PER_TEST.
 *    - Every level costs XP_PER_LEVEL.
 *    - 10 tests = exactly one level. The progress bar moves the
 *      same amount every test; the level number is one ahead of
 *      the floor (level 1 at zero tests, level 2 at 10 tests, …).
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
  /** Lifetime XP across every completed test (= testsCompleted × XP_PER_TEST). */
  totalXp: number;
  /** XP earned inside the current level, 0..XP_PER_LEVEL-1. */
  xpIntoLevel: number;
  /** Fraction of progress into the current level, 0..1. */
  progress: number;
};

export function levelFromTestsCompleted(
  testsCompleted: number,
): LevelStats {
  const safe = Math.max(0, Math.floor(testsCompleted));
  const totalXp = safe * XP_PER_TEST;
  const level = Math.floor(totalXp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = totalXp % XP_PER_LEVEL;
  const progress = xpIntoLevel / XP_PER_LEVEL;
  return { level, totalXp, xpIntoLevel, progress };
}
