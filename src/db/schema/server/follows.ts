import { index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

/** Directed follow edges — the substrate of the friends system.
 *
 *  The graph is **follow + mutual**: a follow is one-way and needs no
 *  approval (`followerId` follows `followeeId`). Two people are
 *  "friends" when a reciprocal pair of edges exists (A→B and B→A);
 *  that mutual state is what unlocks racing a friend + live spectate. There is
 *  no separate `friendships` table — mutuality is computed at read
 *  time (`followsRepo.listFriends` / `isMutual`) so there's nothing to
 *  keep in sync.
 *
 *  Keyed on (followerId, followeeId): "who do I follow" is a
 *  primary-key prefix scan; the secondary index on followeeId serves
 *  "who follows me". Both columns are Clerk user ids (`user_…`). We
 *  follow the same no-FK convention as `tests` / `notifications` —
 *  identity lives on Clerk, the local row is a mirror, and a dangling
 *  edge to a deleted user is harmless (the display layer filters out
 *  ids Clerk can't resolve, exactly like the leaderboard does).
 *
 *  Self-follows (followerId === followeeId) are never written — the
 *  repo no-ops them and the route 400s. No DB-level CHECK so the test
 *  DDL in `src/db/server/testing.ts` stays a 1:1 mirror without
 *  drift. */
export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id").notNull(),
    followeeId: text("followee_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.followerId, t.followeeId] }),
    // "who follows me" — followers query reads by the followee.
    followeeIdx: index("follows_followee_idx").on(t.followeeId),
  }),
);

export type FollowRow = typeof follows.$inferSelect;
export type NewFollowRow = typeof follows.$inferInsert;
