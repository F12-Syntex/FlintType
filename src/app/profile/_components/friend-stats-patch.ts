import type { FriendRelationship, FriendStats } from "@/types/friends";

const bit = (b: boolean | undefined) => (b ? 1 : 0);

/** Patch the subject's friend counts after the viewer's relationship
 *  with them changes, so the hero updates the moment Follow / Unfollow /
 *  Block lands (a background re-fetch then confirms the real numbers).
 *
 *  From the subject's side:
 *  - followers counts the viewer when the viewer follows them;
 *  - following counts the viewer when they follow the viewer back;
 *  - friends counts the viewer while the follow is mutual. */
export function patchFriendStats(
  stats: FriendStats,
  prev: FriendRelationship | null,
  next: FriendRelationship,
): FriendStats {
  const clamp = (v: number) => Math.max(0, v);
  return {
    ...stats,
    followers: clamp(
      stats.followers + bit(next.following) - bit(prev?.following),
    ),
    following: clamp(
      stats.following + bit(next.followedBy) - bit(prev?.followedBy),
    ),
    friends: clamp(stats.friends + bit(next.mutual) - bit(prev?.mutual)),
  };
}
