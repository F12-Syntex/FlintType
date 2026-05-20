import { and, desc, eq, exists, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { follows } from "@/db/schema/server/follows";
import type { ServerDrizzle } from "../driver";

/** A user reference in a follow listing — the other party's Clerk id
 *  plus when the edge was created (newest-first ordering in the UI). */
export type FollowEdge = { userId: string; createdAt: Date };

export function followsRepo(db: ServerDrizzle) {
  return {
    /** Create the directed edge `followerId → followeeId`. Idempotent
     *  via `onConflictDoNothing` — a duplicate follow reports
     *  `created: false` without erroring. Self-follows are silently
     *  refused (the route surfaces a 400 before reaching here, but the
     *  repo guards too so no self-edge can ever be written). */
    async follow(
      followerId: string,
      followeeId: string,
    ): Promise<{ created: boolean }> {
      if (followerId === followeeId) return { created: false };
      const inserted = await db
        .insert(follows)
        .values({ followerId, followeeId })
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
