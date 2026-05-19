/** XP rewards config — ONE source of truth for how much XP each
 *  user-facing action grants. Profile, leaderboard, and any future
 *  surface that shows a level number routes through `computeTotalXp`
 *  + `levelFromXp` (src/lib/level.ts).
 *
 *  Tune values here, not at call sites. The level economy in
 *  `src/lib/level.ts` (XP_PER_LEVEL = 1000) defines what these
 *  numbers mean in user-visible terms:
 *    - 10 tests        =  1 level   (XP_PER_TEST × 10  = 1000)
 *    - ~4 drills       =  1 level   (XP_PER_DRILL × 4 ≈ 1000)
 *    - 5 race wins     =  1 level   (XP_PER_RACE_WIN × 5 = 1000)
 *
 *  Pure — no React, no I/O. */

import { XP_PER_TEST } from "./level";

/** XP for clearing all items in a drill (burst / sudden-death). A
 *  drill takes meaningfully longer than a single test, so it grants
 *  more — but not so much that drills become the dominant grind. */
export const XP_PER_DRILL = 250;

/** XP for finishing a race (any placement). Everyone who completes
 *  the passage earns this; it's the participation reward. */
export const XP_PER_RACE_FINISH = 50;

/** Bonus XP on top of `XP_PER_RACE_FINISH` for finishing 1st. */
export const XP_PER_RACE_WIN = 150;

export type XpCounts = {
  testsCompleted: number;
  drillsCompleted: number;
  /** Number of races the user finished (reached the end of the passage). */
  racesFinished: number;
  /** Number of races finished in 1st place. Must be ≤ racesFinished. */
  racesWon: number;
};

/** Sum every XP-bearing event into a single lifetime balance. Inputs
 *  are clamped to ≥ 0 so a garbled count never produces negative XP. */
export function computeTotalXp(counts: Partial<XpCounts>): number {
  const tests = Math.max(0, Math.floor(counts.testsCompleted ?? 0));
  const drills = Math.max(0, Math.floor(counts.drillsCompleted ?? 0));
  const racesFinished = Math.max(0, Math.floor(counts.racesFinished ?? 0));
  const racesWon = Math.max(
    0,
    Math.min(racesFinished, Math.floor(counts.racesWon ?? 0)),
  );
  return (
    tests * XP_PER_TEST +
    drills * XP_PER_DRILL +
    racesFinished * XP_PER_RACE_FINISH +
    racesWon * XP_PER_RACE_WIN
  );
}

export { XP_PER_TEST };
