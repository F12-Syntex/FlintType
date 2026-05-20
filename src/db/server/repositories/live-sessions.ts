import { eq, inArray, sql } from "drizzle-orm";
import { liveSessions } from "@/db/schema/server/live-sessions";
import type { LiveSnapshot } from "@/types/live";
import type { ServerDrizzle } from "../driver";

export function liveSessionsRepo(db: ServerDrizzle) {
  return {
    /** Publish/refresh a broadcaster's latest snapshot. Upsert. */
    async set(userId: string, snapshot: LiveSnapshot): Promise<void> {
      await db
        .insert(liveSessions)
        .values({ userId, snapshot, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: liveSessions.userId,
          set: { snapshot, updatedAt: sql`now()` },
        });
    },

    /** Latest snapshot + when it was pushed, or null when the user has
     *  no row. Freshness ("is this live?") is the caller's call against
     *  `updatedAt`. */
    async get(
      userId: string,
    ): Promise<{ snapshot: LiveSnapshot; updatedAt: Date } | null> {
      const rows = await db
        .select({ snapshot: liveSessions.snapshot, updatedAt: liveSessions.updatedAt })
        .from(liveSessions)
        .where(eq(liveSessions.userId, userId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return { snapshot: row.snapshot as LiveSnapshot, updatedAt: row.updatedAt };
    },

    /** Snapshots for a batch of users in one round-trip — the friends
     *  hub resolves "who's live now" across the caller's whole friend
     *  set. Absent users (no row) are simply missing from the map;
     *  freshness is the caller's call against each `updatedAt`. */
    async getForUsers(
      userIds: readonly string[],
    ): Promise<Map<string, { snapshot: LiveSnapshot; updatedAt: Date }>> {
      const out = new Map<string, { snapshot: LiveSnapshot; updatedAt: Date }>();
      if (userIds.length === 0) return out;
      const rows = await db
        .select({
          userId: liveSessions.userId,
          snapshot: liveSessions.snapshot,
          updatedAt: liveSessions.updatedAt,
        })
        .from(liveSessions)
        .where(inArray(liveSessions.userId, [...userIds]));
      for (const row of rows) {
        out.set(row.userId, {
          snapshot: row.snapshot as LiveSnapshot,
          updatedAt: row.updatedAt,
        });
      }
      return out;
    },

    /** Drop a user's live row — when a broadcaster stops. */
    async clear(userId: string): Promise<void> {
      await db.delete(liveSessions).where(eq(liveSessions.userId, userId));
    },
  };
}

export type LiveSessionsRepo = ReturnType<typeof liveSessionsRepo>;
