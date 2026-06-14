import { defineRoute } from "@/server";
import { modeFor, sinceFor } from "@/server/leaderboard-window";
import { resolveUserDisplays } from "@/server/user-display";
import {
  leaderboardInputSchema,
  lengthModeForPreset,
  PRESET_AMOUNT,
  type LeaderboardEntry,
  type LeaderboardInput,
  type LeaderboardOutput,
} from "@/types/leaderboard";

const DEFAULT_LIMIT = 25;

/** Friends-scoped leaderboard: the same ranking as the public board,
 *  restricted to the people the caller follows (plus the caller, so
 *  they can see where they sit among friends). Same input + output
 *  shape as `leaderboard.list` so the client renders it through the
 *  identical table. Lives under the auth-gated `friends` namespace —
 *  the caller's id is required to know whose follow set to rank. */
export const leaderboard = defineRoute<LeaderboardInput, LeaderboardOutput>({
  input: leaderboardInputSchema,
  handler: async ({ input, db, meta }) => {
    const me = meta.userId as string;
    const scope = input.scope ?? "all";
    const window = input.window ?? "all_time";
    const preset = input.preset ?? "any";
    const limit = input.limit ?? DEFAULT_LIMIT;

    // The board ranks me + everyone I follow.
    const followingIds = (await db.follows.listFollowing(me)).map(
      (e) => e.userId,
    );
    const userIds = [...new Set([me, ...followingIds])];

    const rows = await db.tests.topLeaderboard({
      mode: modeFor(scope),
      sinceMs: sinceFor(window),
      amount: PRESET_AMOUNT[preset],
      lengthMode: lengthModeForPreset(preset),
      limit,
      userIds,
    });
    if (rows.length === 0) {
      return { scope, window, preset, entries: [], generatedAtMs: Date.now() };
    }

    const displays = await resolveUserDisplays(db, [
      ...new Set(rows.map((r) => r.userId)),
    ]);
    // Drop rows Clerk can't resolve, then re-rank so positions are
    // contiguous — same policy as the public board.
    const named = rows.filter((r) => displays.has(r.userId));
    const entries: LeaderboardEntry[] = named.map((r, i) => {
      const d = displays.get(r.userId)!;
      return {
        testId: r.testId,
        rank: i + 1,
        userId: r.userId,
        name: d.name,
        username: d.username,
        tags: d.tags,
        netWpm: Math.round(r.netWpm),
        wpm: Math.round(r.wpm),
        accuracy: Math.round(r.accuracy * 10) / 10,
        mode: r.mode,
        durationOrWordCount: r.durationOrWordCount,
        completedAtMs: r.completedAt.getTime(),
      };
    });
    return { scope, window, preset, entries, generatedAtMs: Date.now() };
  },
});
