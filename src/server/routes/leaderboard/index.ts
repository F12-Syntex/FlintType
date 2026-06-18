import { clerkClient } from "@clerk/nextjs/server";
import { defineNamespace, defineRoute } from "@/server";
import { modeFor, sinceFor } from "@/server/leaderboard-window";
import { rateLimit } from "@/server/middleware/rate-limit";
import {
  applyTagSelection,
  readTagSelection,
  resolveEligibleTags,
} from "@/server/resolve-tags";
import type { UserTagId } from "@/types/user-tag";
import { XP_PER_TEST, levelFromXp } from "@/lib/level";
import {
  type LifetimeStats,
  readLifetimeStats,
} from "@/lib/lifetime-stats";
import { computeTotalXp } from "@/lib/xp-rewards";
import {
  leaderboardInputSchema,
  lengthModeForPreset,
  PRESET_AMOUNT,
  topByLevelInputSchema,
  topPlayersInputSchema,
  type LeaderboardEntry,
  type LeaderboardInput,
  type LeaderboardOutput,
  type LeaderboardScope,
  type LeaderboardWindow,
  type TopByLevelInput,
  type TopByLevelOutput,
  type TopLevelPlayer,
  type TopPlayer,
  type TopPlayersInput,
  type TopPlayersOutput,
} from "@/types/leaderboard";

const DEFAULT_LIMIT = 25;

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
      lengthMode: lengthModeForPreset(preset),
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
      // Bulk-fetch user-prefs for the same ids so each row honours
      // the racer's tag-display selection. One indexed SELECT covers
      // the whole batch — no per-row roundtrip.
      const prefsByUserId = await db.userPrefs.bulkGet(ids);
      for (const u of data) {
        const raw =
          u.firstName ??
          u.username ??
          u.emailAddresses[0]?.emailAddress?.split("@")[0] ??
          "racer";
        const display = raw.startsWith("@") ? raw : `@${raw}`;
        const eligibleTags = resolveEligibleTags({
          email: u.emailAddresses[0]?.emailAddress,
          publicMetadataTags: (u.publicMetadata as { tags?: unknown } | null)?.tags,
        });
        const selection = readTagSelection(prefsByUserId.get(u.id));
        const tags = applyTagSelection(eligibleTags, selection);
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
        userId: r.userId,
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

const topPlayers = defineRoute<TopPlayersInput, TopPlayersOutput>({
  input: topPlayersInputSchema,
  handler: async ({ input, db, log }) => {
    const limit = input.limit ?? 10;
    const rows = await db.tests.topPlayers({ limit });
    if (rows.length === 0) {
      return { players: [], generatedAtMs: Date.now() };
    }
    // Mirror leaderboard.list's Clerk bulk-fetch + tag resolution.
    // Same shape (name / username / tags) so the client renderer is
    // a one-component reuse rather than two parallel display layers.
    type UserInfo = {
      name: string;
      username: string | null;
      tags: UserTagId[];
    };
    let userInfoByUserId = new Map<string, UserInfo>();
    try {
      const client = await clerkClient();
      const ids = [...new Set(rows.map((r) => r.userId))];
      const { data } = await client.users.getUserList({
        userId: ids,
        limit: ids.length,
      });
      const prefsByUserId = await db.userPrefs.bulkGet(ids);
      for (const u of data) {
        const raw =
          u.firstName ??
          u.username ??
          u.emailAddresses[0]?.emailAddress?.split("@")[0] ??
          "racer";
        const display = raw.startsWith("@") ? raw : `@${raw}`;
        const eligibleTags = resolveEligibleTags({
          email: u.emailAddresses[0]?.emailAddress,
          publicMetadataTags: (u.publicMetadata as { tags?: unknown } | null)
            ?.tags,
        });
        const selection = readTagSelection(prefsByUserId.get(u.id));
        const tags = applyTagSelection(eligibleTags, selection);
        userInfoByUserId.set(u.id, {
          name: display,
          username: u.username ?? null,
          tags,
        });
      }
    } catch (err) {
      log.warn("leaderboard.topPlayers: clerk getUserList failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      userInfoByUserId = new Map();
    }
    const namedRows = rows.filter((r) => userInfoByUserId.has(r.userId));
    const players: TopPlayer[] = namedRows.map((r, i) => {
      const info = userInfoByUserId.get(r.userId)!;
      return {
        rank: i + 1,
        userId: r.userId,
        username: info.username,
        name: info.name,
        tags: info.tags,
        bestNetWpm: Math.round(r.bestNetWpm),
        bestWpm: Math.round(r.bestWpm),
        bestAccuracy: Math.round(r.bestAccuracy * 10) / 10,
        testsCompleted: r.testsCompleted,
      };
    });
    return { players, generatedAtMs: Date.now() };
  },
});

const topByLevel = defineRoute<TopByLevelInput, TopByLevelOutput>({
  input: topByLevelInputSchema,
  handler: async ({ input, db, log }) => {
    const limit = input.limit ?? 10;
    // Over-fetch from the local tests table so the MT-import overlay
    // below has room to re-rank — a user with heavy MT history sits
    // higher post-merge than they did before, and we don't want
    // them clipped out of the top N by the local-only sort. 3x is a
    // pragmatic margin; users who have ONLY MT history and zero
    // local tests still won't appear (the repo query reads from the
    // tests table), but the profile's level formula merges local +
    // MT so we mirror that merge here.
    const repoLimit = Math.max(limit * 3, 25);
    const rows = await db.tests.topByLevel({ limit: repoLimit });
    if (rows.length === 0) {
      return { players: [], generatedAtMs: Date.now() };
    }
    type UserInfo = {
      name: string;
      username: string | null;
      tags: UserTagId[];
      /** MT-imported completed-test count (from
       *  user_prefs.data.monkeytypeStats.completedTests). Profile's
       *  level adds this to the local row count, so the leaderboard
       *  has to do the same to match. */
      mtCompleted: number;
      /** Drill / race counters from the same prefs blob — folded into
       *  the user's total XP via `computeTotalXp` so the leaderboard
       *  level matches the profile hero level when drills are part of
       *  the user's grind. */
      lifetime: LifetimeStats;
    };
    let userInfoByUserId = new Map<string, UserInfo>();
    try {
      const client = await clerkClient();
      const ids = [...new Set(rows.map((r) => r.userId))];
      const { data } = await client.users.getUserList({
        userId: ids,
        limit: ids.length,
      });
      const prefsByUserId = await db.userPrefs.bulkGet(ids);
      for (const u of data) {
        const raw =
          u.firstName ??
          u.username ??
          u.emailAddresses[0]?.emailAddress?.split("@")[0] ??
          "racer";
        const display = raw.startsWith("@") ? raw : `@${raw}`;
        const eligibleTags = resolveEligibleTags({
          email: u.emailAddresses[0]?.emailAddress,
          publicMetadataTags: (u.publicMetadata as { tags?: unknown } | null)
            ?.tags,
        });
        const prefs = prefsByUserId.get(u.id);
        const selection = readTagSelection(prefs);
        const tags = applyTagSelection(eligibleTags, selection);
        // Read MT-imported test count from the same prefs blob the
        // profile reads. Defaults to 0 when the user hasn't imported.
        const mt = prefs?.monkeytypeStats as
          | { completedTests?: number }
          | undefined;
        const mtCompleted = Number(mt?.completedTests ?? 0);
        userInfoByUserId.set(u.id, {
          name: display,
          username: u.username ?? null,
          tags,
          mtCompleted: Number.isFinite(mtCompleted) ? mtCompleted : 0,
          lifetime: readLifetimeStats(prefs ?? null),
        });
      }
    } catch (err) {
      log.warn("leaderboard.topByLevel: clerk getUserList failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      userInfoByUserId = new Map();
    }
    // Combine local + MT + lifetime counters into a single total-XP
    // figure per user, then re-sort by that total so the ranking
    // matches profile-shown levels. Tests + MT-imported tests share
    // the XP_PER_TEST weight; drills/races contribute via
    // `computeTotalXp`.
    const named = rows
      .filter((r) => userInfoByUserId.has(r.userId))
      .map((r) => {
        const info = userInfoByUserId.get(r.userId)!;
        const combined = r.testsCompleted + info.mtCompleted;
        const totalXp =
          combined * XP_PER_TEST + computeTotalXp(info.lifetime);
        return { row: r, info, combined, totalXp };
      })
      .sort((a, b) => b.totalXp - a.totalXp)
      .slice(0, limit);
    const players: TopLevelPlayer[] = named.map((entry, i) => {
      const { row: r, info, combined, totalXp } = entry;
      // Level via the shared src/lib/level.ts economy on the COMBINED
      // XP — same merge the profile hero does in `mergeTotalsWithMt`
      // + drill XP folded in. So the L<n> on the leaderboard matches
      // the L<n> on the user's profile.
      const stats = levelFromXp(totalXp);
      return {
        rank: i + 1,
        userId: r.userId,
        username: info.username,
        name: info.name,
        tags: info.tags,
        xp: stats.totalXp,
        level: stats.level,
        xpIntoLevel: stats.xpIntoLevel,
        levelProgress: stats.progress,
        testsCompleted: combined,
      };
    });
    return { players, generatedAtMs: Date.now() };
  },
});

/** Public — no auth gate. Anyone (signed-in or anonymous) can read
 *  the leaderboard. Rate-limited per IP because the Clerk bulk
 *  lookup on cache miss is the expensive part; 60/min comfortably
 *  covers a human browsing different filters. */
export const leaderboard = defineNamespace({
  middleware: [rateLimit({ limit: 60, windowMs: 60_000 })],
  routes: { list, topPlayers, topByLevel },
});
