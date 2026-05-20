import type { LeaderboardScope, LeaderboardWindow } from "@/types/leaderboard";

const DAY_MS = 24 * 60 * 60 * 1_000;

/** Lower bound (ms epoch) for a leaderboard time window. `all_time`
 *  returns 0 (no lower bound). Shared by the public board
 *  (`leaderboard.list`) and the friends board (`friends.leaderboard`)
 *  so the two can never silently disagree on what "this week" means. */
export function sinceFor(window: LeaderboardWindow): number {
  if (window === "all_time") return 0;
  const now = Date.now();
  if (window === "month") return now - 30 * DAY_MS;
  if (window === "week") return now - 7 * DAY_MS;
  return now - DAY_MS;
}

/** Map a leaderboard scope to the test-row `mode` filter. `all` means
 *  "every mode" (no filter); every other scope filters to that mode. */
export function modeFor(scope: LeaderboardScope): string {
  return scope === "all" ? "all" : scope;
}
