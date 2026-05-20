import { defineNamespace, defineRoute } from "@/server";
import { BackendError } from "@/lib/errors";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import {
  friendTargetSchema,
  type FriendListOutput,
  type FriendRelationship,
  type FriendStats,
  type FriendTargetInput,
} from "@/types/friends";
import { compare } from "./compare";
import { follow } from "./follow";
import { leaderboard } from "./leaderboard";
import { relationshipOf, toFriendUsers } from "./relationship";

/** Stop following `input.userId`. Idempotent — unfollowing someone you
 *  don't follow is a no-op. No notification. Returns the fresh state. */
const unfollow = defineRoute<FriendTargetInput, FriendRelationship>({
  input: friendTargetSchema,
  handler: async ({ input, db, meta }) => {
    const me = meta.userId as string;
    await db.follows.unfollow(me, input.userId);
    return relationshipOf(db, me, input.userId);
  },
});

/** Block `input.userId`: record the block AND sever follow edges in
 *  both directions (the block invariant — a blocked pair shares no
 *  follow relationship). Idempotent. Can't block yourself. */
const block = defineRoute<FriendTargetInput, FriendRelationship>({
  input: friendTargetSchema,
  handler: async ({ input, db, meta, log }) => {
    const me = meta.userId as string;
    const target = input.userId;
    if (target === me) {
      throw new BackendError(400, "VALIDATION", "You can't block yourself.");
    }
    await db.blocks.block(me, target);
    await Promise.all([
      db.follows.unfollow(me, target),
      db.follows.unfollow(target, me),
    ]);
    log.info("friend block", { blockerId: me, blockedId: target });
    return relationshipOf(db, me, target);
  },
});

/** Lift a block. Does not restore the previously-severed follows — the
 *  user re-follows explicitly. Idempotent. */
const unblock = defineRoute<FriendTargetInput, FriendRelationship>({
  input: friendTargetSchema,
  handler: async ({ input, db, meta }) => {
    const me = meta.userId as string;
    await db.blocks.unblock(me, input.userId);
    return relationshipOf(db, me, input.userId);
  },
});

/** The pairwise state between the caller and `input.userId`. Drives the
 *  follow button + "follows you" badge on any profile. */
const relationship = defineRoute<FriendTargetInput, FriendRelationship>({
  input: friendTargetSchema,
  handler: ({ input, db, meta }) =>
    relationshipOf(db, meta.userId as string, input.userId),
});

/** Public follow/friend counts for `input.userId` (any user). */
const stats = defineRoute<FriendTargetInput, FriendStats>({
  input: friendTargetSchema,
  handler: async ({ input, db }) => {
    const target = input.userId;
    const [followers, following, friends] = await Promise.all([
      db.follows.followerCount(target),
      db.follows.followingCount(target),
      db.follows.listFriends(target).then((r) => r.length),
    ]);
    return { userId: target, followers, following, friends };
  },
});

/** Users the caller follows, newest first. */
const listFollowing = defineRoute<void, FriendListOutput>({
  handler: async ({ db, meta }) => ({
    users: await toFriendUsers(db, await db.follows.listFollowing(meta.userId as string)),
  }),
});

/** Users who follow the caller, newest first. */
const listFollowers = defineRoute<void, FriendListOutput>({
  handler: async ({ db, meta }) => ({
    users: await toFriendUsers(db, await db.follows.listFollowers(meta.userId as string)),
  }),
});

/** The caller's friends (mutual follows), newest outgoing edge first. */
const listFriends = defineRoute<void, FriendListOutput>({
  handler: async ({ db, meta }) => ({
    users: await toFriendUsers(db, await db.follows.listFriends(meta.userId as string)),
  }),
});

/** Friends namespace. Every action is performed by the signed-in user,
 *  so `requireAuth` gates the whole namespace; 60/min per-user keeps
 *  follow/unfollow toggling honest without throttling normal use. */
export const friends = defineNamespace({
  middleware: [requireAuth, rateLimit({ limit: 60, windowMs: 60_000 })],
  routes: {
    follow,
    unfollow,
    block,
    unblock,
    relationship,
    stats,
    listFollowing,
    listFollowers,
    listFriends,
    leaderboard,
    compare,
  },
});
