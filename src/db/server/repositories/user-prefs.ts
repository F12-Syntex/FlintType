import { eq, inArray, sql } from "drizzle-orm";
import { userPrefs } from "@/db/schema/server/user-prefs";
import type { ServerDrizzle } from "../driver";

export type UserPrefsBlob = Record<string, unknown>;

export function userPrefsRepo(db: ServerDrizzle) {
  return {
    /** Returns the stored blob for `userId`, or `{}` when there's no
     *  row yet — callers always get an object back. */
    async get(userId: string): Promise<UserPrefsBlob> {
      const rows = await db
        .select({ data: userPrefs.data })
        .from(userPrefs)
        .where(eq(userPrefs.userId, userId))
        .limit(1);
      const data = rows[0]?.data;
      return (data && typeof data === "object" ? data : {}) as UserPrefsBlob;
    },

    /** Bulk lookup — returns a Map of userId → blob for the ids that
     *  have a row. Missing ids are simply absent from the map; the
     *  caller falls back to `{}` if needed. One query for the whole
     *  batch, no N+1. Used by the leaderboard handler to honour every
     *  shown user's tag-display selection in a single roundtrip. */
    async bulkGet(userIds: readonly string[]): Promise<Map<string, UserPrefsBlob>> {
      const out = new Map<string, UserPrefsBlob>();
      if (userIds.length === 0) return out;
      const rows = await db
        .select({ userId: userPrefs.userId, data: userPrefs.data })
        .from(userPrefs)
        .where(inArray(userPrefs.userId, [...userIds]));
      for (const row of rows) {
        const data = row.data && typeof row.data === "object" ? row.data : {};
        out.set(row.userId, data as UserPrefsBlob);
      }
      return out;
    },

    /** Upsert. Replaces the stored blob wholesale — the client is the
     *  source of truth for the merged shape, so partial merges happen
     *  there. Updates the `updatedAt` stamp on every write. */
    async set(userId: string, data: UserPrefsBlob): Promise<void> {
      await db
        .insert(userPrefs)
        .values({ userId, data })
        .onConflictDoUpdate({
          target: userPrefs.userId,
          set: { data, updatedAt: sql`now()` },
        });
    },

    /** Atomically bump `lifetimeStats.drillsCompleted` by 1, server-side.
     *  Drill counts feed the public level / Top-by-Level ranking, so they
     *  must NOT be writable from the client prefs blob (FT-029) — this is
     *  the only path that mutates them. Preserves any other lifetimeStats
     *  fields and works whether or not the slice/row exists yet. */
    async incrementDrillsCompleted(userId: string): Promise<void> {
      await db
        .insert(userPrefs)
        .values({
          userId,
          data: { lifetimeStats: { drillsCompleted: 1 } },
        })
        .onConflictDoUpdate({
          target: userPrefs.userId,
          set: {
            data: sql`coalesce(${userPrefs.data}, '{}'::jsonb) || jsonb_build_object(
              'lifetimeStats',
              coalesce(${userPrefs.data} -> 'lifetimeStats', '{}'::jsonb) || jsonb_build_object(
                'drillsCompleted',
                coalesce((${userPrefs.data} #>> '{lifetimeStats,drillsCompleted}')::int, 0) + 1
              )
            )`,
            updatedAt: sql`now()`,
          },
        });
    },

    /** Merge a partial shape into the stored blob. One query under
     *  Postgres `jsonb || $patch` semantics so we don't race a
     *  concurrent reader against a wholesale `set`. Used by routes
     *  that own a single slot inside the blob (e.g. `profile.setTags`
     *  writing only `selectedTags`) and don't want to clobber
     *  unrelated slots written by the client. */
    async merge(userId: string, patch: UserPrefsBlob): Promise<void> {
      await db
        .insert(userPrefs)
        .values({ userId, data: patch })
        .onConflictDoUpdate({
          target: userPrefs.userId,
          set: {
            data: sql`coalesce(${userPrefs.data}, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb`,
            updatedAt: sql`now()`,
          },
        });
    },
  };
}

export type UserPrefsRepo = ReturnType<typeof userPrefsRepo>;
