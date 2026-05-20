import { defineRoute } from "@/server";
import { BackendError } from "@/lib/errors";
import { resolveUserDisplays } from "@/server/user-display";
import {
  friendTargetSchema,
  type FriendRelationship,
  type FriendTargetInput,
} from "@/types/friends";
import type {
  FollowNotificationData,
  MutualNotificationData,
} from "@/types/notification";
import { relationshipOf } from "./relationship";

/** Follow `input.userId`. The caller is `meta.userId`.
 *
 *  Guards: can't follow yourself (400), can't follow across a block in
 *  either direction (403), target must be a real Clerk user (404).
 *
 *  Side-effects fire only on a *newly created* edge (idempotent
 *  re-follows are silent):
 *    - a `follow` notification to the target (dedupe `follow:<me>`);
 *    - if this completed a reciprocal pair, a `mutual` notification to
 *      both users (dedupe `mutual:<sorted-pair>`, once per friendship).
 *
 *  Returns the fresh `FriendRelationship` so the client re-renders the
 *  button without a follow-up read. */
export const follow = defineRoute<FriendTargetInput, FriendRelationship>({
  input: friendTargetSchema,
  handler: async ({ input, db, meta, log }) => {
    const me = meta.userId as string;
    const target = input.userId;

    if (target === me) {
      throw new BackendError(400, "VALIDATION", "You can't follow yourself.");
    }
    if (await db.blocks.eitherBlocks(me, target)) {
      throw new BackendError(403, "FORBIDDEN", "You can't follow this user.");
    }

    // One Clerk round-trip validates the target exists AND gives us both
    // handles for the notification bodies.
    const displays = await resolveUserDisplays(db, [me, target]);
    const targetDisplay = displays.get(target);
    if (!targetDisplay) {
      throw new BackendError(404, "NOT_FOUND", "That user doesn't exist.");
    }
    // Soft fallback: the caller is always a live session, so `me`
    // should resolve in the same batch — but if Clerk omits the
    // caller's own record we still let the follow succeed and degrade
    // the notification copy to "Someone" rather than failing the
    // action. The edge (and `followerId` in the data) is the
    // load-bearing part; the display string is cosmetic.
    const meDisplay = displays.get(me);
    const meName = meDisplay?.name ?? "Someone";

    const { created } = await db.follows.follow(me, target);
    if (created) {
      await db.notifications.createIfAbsent({
        userId: target,
        kind: "follow",
        title: "New follower",
        body: `${meName} started following you.`,
        data: {
          followerId: me,
          followerName: meDisplay?.name ?? me,
          followerUsername: meDisplay?.username ?? null,
        } satisfies FollowNotificationData,
        dedupeKey: `follow:${me}`,
      });

      if (await db.follows.isMutual(me, target)) {
        const pairKey = `mutual:${[me, target].sort().join(":")}`;
        await Promise.all([
          db.notifications.createIfAbsent({
            userId: me,
            kind: "mutual",
            title: "New friend",
            body: `You and ${targetDisplay.name} are now friends.`,
            data: {
              friendId: target,
              friendName: targetDisplay.name,
              friendUsername: targetDisplay.username,
            } satisfies MutualNotificationData,
            dedupeKey: pairKey,
          }),
          db.notifications.createIfAbsent({
            userId: target,
            kind: "mutual",
            title: "New friend",
            body: `You and ${meName} are now friends.`,
            data: {
              friendId: me,
              friendName: meDisplay?.name ?? me,
              friendUsername: meDisplay?.username ?? null,
            } satisfies MutualNotificationData,
            dedupeKey: pairKey,
          }),
        ]);
      }
      log.info("friend follow", { followerId: me, followeeId: target });
    }

    return relationshipOf(db, me, target);
  },
});
