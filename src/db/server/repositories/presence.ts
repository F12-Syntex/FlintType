import { inArray, sql } from "drizzle-orm";
import { presence, type PresenceRow } from "@/db/schema/server/presence";
import type { ServerDrizzle } from "../driver";

export function presenceRepo(db: ServerDrizzle) {
  return {
    /** Mark `userId` seen now with the given coarse status. Upsert. */
    async heartbeat(userId: string, status: string): Promise<void> {
      await db
        .insert(presence)
        .values({ userId, status, lastSeenAt: new Date() })
        .onConflictDoUpdate({
          target: presence.userId,
          set: { status, lastSeenAt: sql`now()` },
        });
    },

    /** Presence rows for a batch of users. Ids without a row are simply
     *  absent (the caller treats them as offline). Empty input → no
     *  query. */
    async getForUsers(userIds: readonly string[]): Promise<PresenceRow[]> {
      if (userIds.length === 0) return [];
      return db
        .select()
        .from(presence)
        .where(inArray(presence.userId, [...userIds]));
    },
  };
}

export type PresenceRepo = ReturnType<typeof presenceRepo>;
