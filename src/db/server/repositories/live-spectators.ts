import { and, eq, lt, sql } from "drizzle-orm";
import { liveSpectators } from "@/db/schema/server/live-spectators";
import type { ServerDrizzle } from "../driver";

/** Rows older than this are dead weight — a spectator's edge is only
 *  "fresh" for a few seconds (SPECTATOR_TTL_MS ≈ 4s), so anything past
 *  ~10× the live TTL (LIVE_TTL_MS = 6s) can never be read again and is
 *  safe to delete. Without a sweep the table only grows: `touch` upserts
 *  on every watch poll and `remove` fires only on an explicit stop. */
export const SPECTATOR_SWEEP_STALE_MS = 60_000;

/** Lazy-sweep throttle — at most one DELETE per process per minute,
 *  mirroring the in-memory rate-limit store's sweep cadence. */
export const SPECTATOR_SWEEP_INTERVAL_MS = 60_000;

// Per-process throttle for the lazy sweep below — module scope so every
// repo instance in the process shares one timestamp.
let lastSweepAt = 0;

/** Exposed for tests — clear the per-process sweep throttle so a fresh
 *  test starts with an immediate sweep. */
export function _resetSweepThrottle(): void {
  lastSweepAt = 0;
}

export function liveSpectatorsRepo(db: ServerDrizzle) {

  /** Delete rows whose last poll is older than the stale window.
   *  Race-safe: a concurrent `touch` either lands before the DELETE's
   *  snapshot (row is fresh, kept) or after it (row re-inserted) — and
   *  the window is ~15× the freshness TTL, so a swept row was never
   *  going to be returned by `listFor` anyway. Best-effort: a failure
   *  is swallowed so a read never breaks on cleanup. */
  async function sweep(now: number): Promise<void> {
    try {
      await db
        .delete(liveSpectators)
        .where(
          lt(liveSpectators.updatedAt, new Date(now - SPECTATOR_SWEEP_STALE_MS)),
        );
    } catch {
      // Best-effort cleanup — the next read retries.
    }
  }

  async function maybeSweep(now: number): Promise<void> {
    if (now - lastSweepAt < SPECTATOR_SWEEP_INTERVAL_MS) return;
    lastSweepAt = now;
    await sweep(now);
  }

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
     *  a spectator who closed the tab simply ages out. Piggybacks the
     *  lazy stale-row sweep (at most once a minute per process). */
    async listFor(broadcasterId: string, ttlMs: number): Promise<string[]> {
      const now = Date.now();
      await maybeSweep(now);
      const rows = await db
        .select({
          spectatorId: liveSpectators.spectatorId,
          updatedAt: liveSpectators.updatedAt,
        })
        .from(liveSpectators)
        .where(eq(liveSpectators.broadcasterId, broadcasterId));
      return rows
        .filter((r) => now - r.updatedAt.getTime() < ttlMs)
        .map((r) => r.spectatorId);
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

    /** Exposed for tests — run the stale-row sweep synchronously,
     *  bypassing the once-a-minute throttle. */
    async _sweep(now: number = Date.now()): Promise<void> {
      await sweep(now);
    },
  };
}

export type LiveSpectatorsRepo = ReturnType<typeof liveSpectatorsRepo>;
