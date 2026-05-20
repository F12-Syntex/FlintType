import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

/** Block edges. `blockerId` has blocked `blockedId`. A block is the
 *  hard override on top of the follow graph:
 *
 *    - blocking severs follow edges in **both** directions (the route
 *      orchestrates `blocks.add` + `follows.unfollow` both ways);
 *    - while a block exists in *either* direction, neither party can
 *      (re-)follow the other, duel, or spectate.
 *
 *  Keyed on (blockerId, blockedId). Both "who have I blocked"
 *  (`listBlocked`, PK-prefix scan) and the directional checks
 *  (`isBlocked`, `eitherBlocks`) are primary-key lookups, so no
 *  secondary index is needed. Same no-FK convention as `follows`. */
export const blocks = pgTable(
  "blocks",
  {
    blockerId: text("blocker_id").notNull(),
    blockedId: text("blocked_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.blockerId, t.blockedId] }),
  }),
);

export type BlockRow = typeof blocks.$inferSelect;
export type NewBlockRow = typeof blocks.$inferInsert;
