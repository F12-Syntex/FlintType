import { and, eq, lt, sql } from "drizzle-orm";
import { liveSpectators } from "@/db/schema/server/live-spectators";
import type { ServerDrizzle } from "../driver";

export function liveSpectatorsRepo(db: ServerDrizzle) {
  return {
    /** Record/refresh that `spectatorId` is watching `broadcasterId`
     *  right now. Upsert — called on every live `watch` poll. */
    async touch(broadcasterId: string, spectatorId: string): Promise<void> {
      if (broadcasterId === spectatorId) return;
      await db
        .insert(liveSpectators)
        .values({ broadcasterId, spectatorId, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [liveSpectators.broadcasterId, liveSpectators.spectatorId],
          set: { updatedAt: sql`now()` },
        });
    },

    /** Spectator ids currently watching `broadcasterId` — those whose
     *  last poll is within `ttlMs`. Freshness is filtered in JS against
     *  the row timestamp, mirroring how live_sessions liveness works, so
     *  a spectator who closed the tab simply ages out. */
    async listFor(broadcasterId: string, ttlMs: number): Promise<string[]> {
      const rows = await db
        .select({
          spectatorId: liveSpectators.spectatorId,
          updatedAt: liveSpectators.updatedAt,
        })
        .from(liveSpectators)
        .where(eq(liveSpectators.broadcasterId, broadcasterId));
      const now = Date.now();
      const fresh = rows
        .filter((r) => now - r.updatedAt.getTime() < ttlMs)
        .map((r) => r.spectatorId);
      // Lazy reap: drop this broadcaster's stale rows so the table doesn't
      // only ever grow (it previously deleted only on an explicit stop, so
      // a spectator who closed the tab left a row forever — issue #1).
      // Bounded, indexed, and fire-and-forget so it never slows the poll.
      if (fresh.length !== rows.length) {
        void db
          .delete(liveSpectators)
          .where(
            and(
              eq(liveSpectators.broadcasterId, broadcasterId),
              lt(liveSpectators.updatedAt, new Date(now - ttlMs)),
            ),
          )
          .catch(() => {
            /* a failed reap is harmless — the rows just age out again */
          });
      }
      return fresh;
    },

    /** Drop a single watcher edge — when a spectator explicitly stops. */
    async remove(broadcasterId: string, spectatorId: string): Promise<void> {
      await db
        .delete(liveSpectators)
        .where(
          and(
            eq(liveSpectators.broadcasterId, broadcasterId),
            eq(liveSpectators.spectatorId, spectatorId),
          ),
        );
    },
  };
}

export type LiveSpectatorsRepo = ReturnType<typeof liveSpectatorsRepo>;
