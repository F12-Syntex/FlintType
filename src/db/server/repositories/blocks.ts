import { and, desc, eq, or, sql } from "drizzle-orm";
import { blocks } from "@/db/schema/server/blocks";
import type { ServerDrizzle } from "../driver";

/** A blocked-user reference — the blocked party's Clerk id + when the
 *  block was created. */
export type BlockEdge = { userId: string; createdAt: Date };

export function blocksRepo(db: ServerDrizzle) {
  return {
    /** Record that `blockerId` blocks `blockedId`. Idempotent. Severing
     *  the follow edges is the route's job (it calls `follows.unfollow`
     *  both ways) so this repo stays single-purpose. Self-blocks are
     *  refused. */
    async block(
      blockerId: string,
      blockedId: string,
    ): Promise<{ created: boolean }> {
      if (blockerId === blockedId) return { created: false };
      const inserted = await db
        .insert(blocks)
        .values({ blockerId, blockedId })
        .onConflictDoNothing()
        .returning();
      return { created: inserted.length > 0 };
    },

    /** Remove the block. No-op when it doesn't exist. */
    async unblock(blockerId: string, blockedId: string): Promise<void> {
      await db
        .delete(blocks)
        .where(
          and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)),
        );
    },

    /** Has `blockerId` blocked `blockedId`? Single PK lookup. */
    async isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
      const rows = await db
        .select({ one: sql<number>`1` })
        .from(blocks)
        .where(
          and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)),
        )
        .limit(1);
      return rows.length > 0;
    },

    /** Does a block exist in *either* direction between `a` and `b`?
     *  This is the gate the follow / duel / spectate paths consult —
     *  a block by either party severs the relationship for both. */
    async eitherBlocks(a: string, b: string): Promise<boolean> {
      const rows = await db
        .select({ blocker: blocks.blockerId })
        .from(blocks)
        .where(
          or(
            and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)),
            and(eq(blocks.blockerId, b), eq(blocks.blockedId, a)),
          ),
        )
        .limit(1);
      return rows.length > 0;
    },

    /** Users `userId` has blocked, newest first. */
    async listBlocked(userId: string): Promise<BlockEdge[]> {
      return db
        .select({ userId: blocks.blockedId, createdAt: blocks.createdAt })
        .from(blocks)
        .where(eq(blocks.blockerId, userId))
        .orderBy(desc(blocks.createdAt));
    },
  };
}

export type BlocksRepo = ReturnType<typeof blocksRepo>;
