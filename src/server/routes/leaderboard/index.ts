import { clerkClient } from "@clerk/nextjs/server";
import { defineNamespace, defineRoute } from "@/server";
import { rateLimit } from "@/server/middleware/rate-limit";
import {
  leaderboardInputSchema,
  type LeaderboardEntry,
  type LeaderboardInput,
  type LeaderboardOutput,
  type LeaderboardScope,
  type LeaderboardWindow,
} from "@/types/leaderboard";

const DAY_MS = 24 * 60 * 60 * 1_000;
const DEFAULT_LIMIT = 25;

function sinceFor(window: LeaderboardWindow): number {
  if (window === "all_time") return 0;
  const now = Date.now();
  if (window === "month") return now - 30 * DAY_MS;
  if (window === "week") return now - 7 * DAY_MS;
  return now - DAY_MS;
}

function modeFor(scope: LeaderboardScope): string {
  return scope === "all" ? "all" : scope;
}

const list = defineRoute<LeaderboardInput, LeaderboardOutput>({
  input: leaderboardInputSchema,
  handler: async ({ input, db, log }) => {
    const scope = input.scope ?? "all";
    const window = input.window ?? "all_time";
    const limit = input.limit ?? DEFAULT_LIMIT;
    const rows = await db.tests.topLeaderboard({
      mode: modeFor(scope),
      sinceMs: sinceFor(window),
      limit,
    });
    if (rows.length === 0) {
      return {
        scope,
        window,
        entries: [],
        generatedAtMs: Date.now(),
      };
    }
    // Resolve Clerk display names in one bulk fetch. Clerk's
    // getUserList accepts a `userId` array, returning the same set.
    // If a user has been deleted from Clerk we fall back to "Guest".
    let nameByUserId = new Map<string, { name: string; username: string | null }>();
    try {
      const client = await clerkClient();
      const ids = [...new Set(rows.map((r) => r.userId))];
      const { data } = await client.users.getUserList({ userId: ids, limit: ids.length });
      for (const u of data) {
        const raw =
          u.firstName ??
          u.username ??
          u.emailAddresses[0]?.emailAddress?.split("@")[0] ??
          "racer";
        const display = raw.startsWith("@") ? raw : `@${raw}`;
        nameByUserId.set(u.id, {
          name: display,
          username: u.username ?? null,
        });
      }
    } catch (err) {
      // Clerk lookup failures shouldn't fail the route — the page
      // still renders with anonymised entries. Logged so we notice
      // if it's a regression rather than a transient blip.
      log.warn("leaderboard: clerk getUserList failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      nameByUserId = new Map();
    }
    const entries: LeaderboardEntry[] = rows.map((r, i) => {
      const named = nameByUserId.get(r.userId);
      return {
        testId: r.testId,
        rank: i + 1,
        name: named?.name ?? "Guest",
        username: named?.username ?? null,
        netWpm: Math.round(r.netWpm),
        wpm: Math.round(r.wpm),
        accuracy: Math.round(r.accuracy * 10) / 10,
        mode: r.mode,
        durationOrWordCount: r.durationOrWordCount,
        completedAtMs: r.completedAt.getTime(),
      };
    });
    return {
      scope,
      window,
      entries,
      generatedAtMs: Date.now(),
    };
  },
});

/** Public — no auth gate. Anyone (signed-in or anonymous) can read
 *  the leaderboard. Rate-limited per IP because the Clerk bulk
 *  lookup on cache miss is the expensive part; 60/min comfortably
 *  covers a human browsing different filters. */
export const leaderboard = defineNamespace({
  middleware: [rateLimit({ limit: 60, windowMs: 60_000 })],
  routes: { list },
});
