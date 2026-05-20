import { z } from "zod";
import type { UserTagId } from "./user-tag";

/** Clerk user id (`user_…`). Bounded so a malformed client can't push
 *  an unbounded string into the graph; 64 leaves headroom over Clerk's
 *  ~32-char ids without exposing a vector. */
export const friendUserIdSchema = z.string().min(1).max(64);

/** Every mutating + relationship route addresses a single other user
 *  by id; the caller is always the authenticated `meta.userId`. */
export const friendTargetSchema = z.object({ userId: friendUserIdSchema });
export type FriendTargetInput = z.infer<typeof friendTargetSchema>;

/** The full pairwise state between the caller (`me`) and `userId`.
 *  Returned by every mutation (follow / unfollow / block / unblock) so
 *  the client re-renders the follow button straight from the response,
 *  and by the standalone `relationship` route for arbitrary profiles.
 *
 *  `mutual` (following && followedBy) is the gate that unlocks duels +
 *  live spectate in later steps. */
export type FriendRelationship = {
  userId: string;
  /** me → userId */
  following: boolean;
  /** userId → me ("follows you") */
  followedBy: boolean;
  /** both directions — i.e. friends */
  mutual: boolean;
  /** me has blocked userId */
  blocking: boolean;
  /** userId has blocked me */
  blockedBy: boolean;
};

/** A user as rendered in a following / followers / friends list:
 *  display info plus when the edge formed. The friends page composes
 *  follow-back button state client-side from the three lists, so list
 *  items don't carry per-row relationship flags. */
export type FriendUser = {
  userId: string;
  username: string | null;
  /** `@handle` display name. */
  name: string;
  tags: UserTagId[];
  /** Clerk avatar URL; null when unresolved. */
  imageUrl: string | null;
  /** ms epoch — when the (outgoing, for following/friends; incoming,
   *  for followers) edge was created. Drives newest-first order. */
  sinceMs: number;
};

export type FriendListOutput = { users: FriendUser[] };

/** Public follow/friend counts for any user — drives the numbers on a
 *  profile hero. Friend count is the size of the mutual set. */
export type FriendStats = {
  userId: string;
  followers: number;
  following: number;
  friends: number;
};

/** Headline aggregates for one side of a head-to-head compare. All
 *  computed from completed flinttype runs (not MonkeyType-merged). */
export type UserCompareStats = {
  testsCompleted: number;
  bestWpm: number;
  bestNetWpm: number;
  bestAccuracy: number;
};

/** One side of the compare — display info + stats. */
export type CompareSide = {
  userId: string;
  username: string | null;
  name: string;
  tags: UserTagId[];
  stats: UserCompareStats;
};

/** Head-to-head: the caller (`me`) against `them` (the profile being
 *  viewed). */
export type CompareOutput = { me: CompareSide; them: CompareSide };
