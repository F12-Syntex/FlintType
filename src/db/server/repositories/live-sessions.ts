import { eq, sql } from "drizzle-orm";
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

    /** Drop a user's live row — when a broadcaster stops. */
    async clear(userId: string): Promise<void> {
      await db.delete(liveSessions).where(eq(liveSessions.userId, userId));
    },
  };
}

export type LiveSessionsRepo = ReturnType<typeof liveSessionsRepo>;
