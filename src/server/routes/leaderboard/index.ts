import { clerkClient } from "@clerk/nextjs/server";
import { defineNamespace, defineRoute } from "@/server";
import { rateLimit } from "@/server/middleware/rate-limit";
import { resolveTagsFromClerkUser } from "@/server/resolve-tags";
import type { UserTagId } from "@/types/user-tag";
import {
  leaderboardInputSchema,
  PRESET_AMOUNT,
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
    const preset = input.preset ?? "any";
    const limit = input.limit ?? DEFAULT_LIMIT;
    const rows = await db.tests.topLeaderboard({
      mode: modeFor(scope),
      sinceMs: sinceFor(window),
      amount: PRESET_AMOUNT[preset],
      limit,
    });
    if (rows.length === 0) {
      return {
        scope,
        window,
        preset,
        entries: [],
        generatedAtMs: Date.now(),
      };
    }
    // Resolve Clerk display names in one bulk fetch. Clerk's
    // getUserList accepts a `userId` array, returning the same set.
    // Rows whose userId Clerk doesn't recognise (deleted user, or a
    // total Clerk outage) are filtered out below — we don't ship
    // "Guest" placeholders to the leaderboard.
    //
    // Same fetch also drives identity-tag resolution: each user's
    // emailAddresses + publicMetadata feed into resolveTagsFromClerkUser
    // so we don't pay a second Clerk roundtrip per entry.
    type UserInfo = {
      name: string;
      username: string | null;
      tags: UserTagId[];
    };
    let userInfoByUserId = new Map<string, UserInfo>();
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
        const tags = resolveTagsFromClerkUser({
          email: u.emailAddresses[0]?.emailAddress,
          publicMetadataTags: (u.publicMetadata as { tags?: unknown } | null)?.tags,
        });
        userInfoByUserId.set(u.id, {
          name: display,
          username: u.username ?? null,
          tags,
        });
      }
    } catch (err) {
      // Clerk lookup failures shouldn't fail the route — we simply
      // emit no entries this cycle rather than blast the table with
      // anonymised rows. Logged so a regression is visible.
      log.warn("leaderboard: clerk getUserList failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      userInfoByUserId = new Map();
    }
    // Strip rows that don't have a known Clerk user. Re-rank afterwards
    // so positions are contiguous (1, 2, 3 …) on the filtered list.
    const namedRows = rows.filter((r) => userInfoByUserId.has(r.userId));
    const entries: LeaderboardEntry[] = namedRows.map((r, i) => {
      const info = userInfoByUserId.get(r.userId)!;
      return {
        testId: r.testId,
        rank: i + 1,
        name: info.name,
        username: info.username,
        tags: info.tags,
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
      preset,
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
