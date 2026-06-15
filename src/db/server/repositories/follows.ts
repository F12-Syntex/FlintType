import { and, desc, eq, exists, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { blocks } from "@/db/schema/server/blocks";
import { follows } from "@/db/schema/server/follows";
import type { ServerDrizzle } from "../driver";

/** A user reference in a follow listing — the other party's Clerk id
 *  plus when the edge was created (newest-first ordering in the UI). */
export type FollowEdge = { userId: string; createdAt: Date };

export function followsRepo(db: ServerDrizzle) {
  return {
    /** Create the directed edge `followerId → followeeId`.
     *
     *  **Block-aware atomic insert.** The edge is written only if no
     *  block exists in *either* direction between the two users, and
     *  that check happens in the SAME statement as the INSERT
     *  (`INSERT ... SELECT ... WHERE NOT EXISTS (... blocks ...)`), so
     *  there is no application-level TOCTOU window between checking for a
     *  block and writing the edge. This closes the reported FT-044 case: a
     *  `friends.follow` whose block-check was a *separate, earlier*
     *  statement followed by a ~100ms Clerk round-trip before the INSERT
     *  could race a concurrent `friends.block` landing in that wide gap and
     *  leave a dangling follow edge across a block.
     *
     *  Because the `block` route inserts the block row *before* deleting
     *  follow edges, the practical interleavings are safe: a follow-INSERT
     *  whose snapshot is after the block commits sees the block and writes
     *  nothing; one whose snapshot is before it writes the edge, but the
     *  block route's subsequent two-way `unfollow` then deletes it.
     *
     *  A sub-millisecond residual remains in theory: at READ COMMITTED a
     *  follow-INSERT could evaluate NOT EXISTS before the block commits and
     *  not commit its own row until after the block route's `unfollow`
     *  (which misses the still-uncommitted edge) — a cross-table write-skew.
     *  Fully closing it needs SERIALIZABLE isolation or pair-keyed locking,
     *  neither of which the production neon-http driver supports (it is
     *  stateless and `transaction()` throws). It's left open deliberately:
     *  the window shrank from a ~100ms app-level gap to a single-statement
     *  server-side window that the stateless one-request-per-statement model
     *  makes unreachable in practice (and impossible on serial PGlite), for
     *  a LOW-severity presence leak. Don't "fix" it by wrapping the block
     *  route in `transaction()` — that crashes on neon-http.
     *
     *  Idempotent via `onConflictDoNothing` — a duplicate follow reports
     *  `created: false` without erroring. `created` is therefore `false`
     *  whenever a row was *not* inserted: a block exists in either
     *  direction, the edge is a duplicate, or it's a self-follow.
     *  Self-follows are short-circuited up front (the route 400s before
     *  reaching here, but the repo guards too so no self-edge is ever
     *  written). */
    async follow(
      followerId: string,
      followeeId: string,
    ): Promise<{ created: boolean }> {
      if (followerId === followeeId) return { created: false };
      // INSERT ... SELECT <const>, <const> WHERE NOT EXISTS (block in
      // either direction) — the block test and the insert are one
      // statement, so no snapshot can write an edge across a block. The
      // SELECT has no FROM (a constant-row select); Postgres emits one
      // row when the NOT EXISTS holds, zero otherwise. `.returning()`
      // yields the inserted rows on both the pglite and neon-http
      // drivers, so `length > 0` is the portable created flag — the same
      // read this repo already relies on for `onConflictDoNothing`.
      // Drizzle generates the full column list for an INSERT ... SELECT,
      // so the SELECT supplies all three columns (created_at via now(),
      // matching the column default of the plain `.values()` insert).
      const inserted = await db
        .insert(follows)
        .select(
          sql`
            select ${followerId} as follower_id, ${followeeId} as followee_id, now() as created_at
            where not exists (
              select 1 from ${blocks}
              where (${blocks.blockerId} = ${followerId} and ${blocks.blockedId} = ${followeeId})
                 or (${blocks.blockerId} = ${followeeId} and ${blocks.blockedId} = ${followerId})
            )
          `,
        )
        .onConflictDoNothing()
        .returning();
      return { created: inserted.length > 0 };
    },

    /** Remove the directed edge. No-op when it doesn't exist. */
    async unfollow(followerId: string, followeeId: string): Promise<void> {
      await db
        .delete(follows)
        .where(
          and(
            eq(follows.followerId, followerId),
            eq(follows.followeeId, followeeId),
          ),
        );
    },

    /** Does `followerId` follow `followeeId`? Single PK lookup. */
    async isFollowing(
      followerId: string,
      followeeId: string,
    ): Promise<boolean> {
      const rows = await db
        .select({ one: sql<number>`1` })
        .from(follows)
        .where(
          and(
            eq(follows.followerId, followerId),
            eq(follows.followeeId, followeeId),
          ),
        )
        .limit(1);
      return rows.length > 0;
    },

    /** True when both directions exist (A→B and B→A) — i.e. the two
     *  users are friends. One query: fetch the (≤2) edges between the
     *  pair and check both are present. Distinct rows are guaranteed
     *  by the composite PK, so a count of 2 means mutual. */
    async isMutual(a: string, b: string): Promise<boolean> {
      if (a === b) return false;
      const rows = await db
        .select({ follower: follows.followerId })
        .from(follows)
        .where(
          or(
            and(eq(follows.followerId, a), eq(follows.followeeId, b)),
            and(eq(follows.followerId, b), eq(follows.followeeId, a)),
          ),
        );
      return rows.length === 2;
    },

    /** Users `userId` follows, newest edge first. */
    async listFollowing(userId: string): Promise<FollowEdge[]> {
      return db
        .select({ userId: follows.followeeId, createdAt: follows.createdAt })
        .from(follows)
        .where(eq(follows.followerId, userId))
        .orderBy(desc(follows.createdAt));
    },

    /** Users who follow `userId`, newest edge first. */
    async listFollowers(userId: string): Promise<FollowEdge[]> {
      return db
        .select({ userId: follows.followerId, createdAt: follows.createdAt })
        .from(follows)
        .where(eq(follows.followeeId, userId))
        .orderBy(desc(follows.createdAt));
    },

    /** Mutual follows ("friends") of `userId`, newest *outgoing* edge
     *  first. Correlated EXISTS: keep every followee of `userId` for
     *  whom a reciprocal edge back to `userId` also exists. */
    async listFriends(userId: string): Promise<FollowEdge[]> {
      const back = alias(follows, "follows_back");
      return db
        .select({ userId: follows.followeeId, createdAt: follows.createdAt })
        .from(follows)
        .where(
          and(
            eq(follows.followerId, userId),
            exists(
              db
                .select({ one: sql<number>`1` })
                .from(back)
                .where(
                  and(
                    eq(back.followerId, follows.followeeId),
                    eq(back.followeeId, userId),
                  ),
                ),
            ),
          ),
        )
        .orderBy(desc(follows.createdAt));
    },

    /** Count of users `userId` follows. */
    async followingCount(userId: string): Promise<number> {
      const rows = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(follows)
        .where(eq(follows.followerId, userId));
      return rows[0]?.n ?? 0;
    },

    /** Count of users who follow `userId`. */
    async followerCount(userId: string): Promise<number> {
      const rows = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(follows)
        .where(eq(follows.followeeId, userId));
      return rows[0]?.n ?? 0;
    },
  };
}

export type FollowsRepo = ReturnType<typeof followsRepo>;
