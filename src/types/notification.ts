import { z } from "zod";

/** Discriminated union over the data payloads we know how to render.
 *  Adding a new kind = add a new variant here + a renderer arm in the
 *  popover. No DB migration needed — the `kind` column is `text` and
 *  the `data` column is `jsonb`. */
export type NotificationKind =
  | "announcement"
  | "personal_best"
  | "og_granted"
  | "follow"
  | "mutual"
  | "friend_pb"
  | "duel_challenge"
  | "duel_result";

export type AnnouncementData = {
  /** Optional CTA URL — when present the row becomes a link. */
  href?: string;
};

export type PersonalBestData = {
  /** Mode the run was in ("casual" / "training" / etc). */
  mode: string;
  /** Words for WORDS mode, seconds for TIME mode. */
  durationOrWordCount: number;
  /** WPM achieved on the run that beat the prior best. */
  wpm: number;
  /** Accuracy of that same run, paired with the speed. */
  accuracy: number;
  /** Previous best WPM in the same (mode, length) bucket, or null
   *  on the very first completed run. */
  previousWpm: number | null;
};

/** Fired the first time a user lands in the OG milestone window
 *  (`seq <= OG_MILESTONE_LIMIT`). Dedupes on the kind so a transient
 *  Clerk failure can't double-fire on retry. The renderer paints the
 *  OG `<UserTag>` chip inside the row body. */
export type OgGrantedData = {
  /** This user's signup-order seq (1-based, monotonic). */
  seq: number;
  /** The milestone cap when the grant fired (currently 1000). */
  milestoneLimit: number;
};

/** Someone started following the recipient. Dedupes on the follower
 *  (`follow:<followerId>`) so an unfollow→refollow loop can't spam the
 *  bell. The renderer paints the follower's `@handle` and links to
 *  their profile. */
export type FollowNotificationData = {
  followerId: string;
  /** `@handle` of the follower, baked at creation. */
  followerName: string;
  followerUsername: string | null;
};

/** A reciprocal follow completed — the recipient and `friendId` are
 *  now friends. Dedupes on the sorted pair (`mutual:<a>:<b>`) so it
 *  fires once per friendship, ever. */
export type MutualNotificationData = {
  friendId: string;
  friendName: string;
  friendUsername: string | null;
};

/** A user you follow set a personal best. Fanned out to their
 *  followers, deduped on the run (`friend_pb:<testId>`). Carries the
 *  friend's `@handle` + the run so the feed row links + reads richly. */
export type FriendPbNotificationData = {
  friendId: string;
  friendName: string;
  friendUsername: string | null;
  mode: string;
  durationOrWordCount: number;
  wpm: number;
  accuracy: number;
};

/** A friend challenged the recipient to beat a recorded run. Links to
 *  `/duel/<duelId>` where the recipient races the ghost. */
export type DuelChallengeData = {
  duelId: string;
  challengerId: string;
  challengerName: string;
  challengerUsername: string | null;
  challengerWpm: number;
  mode: string;
  durationOrWordCount: number;
};

/** The opponent finished a duel the recipient issued. `won` is from
 *  the opponent's perspective (true = they beat the recipient's run). */
export type DuelResultData = {
  duelId: string;
  opponentId: string;
  opponentName: string;
  opponentUsername: string | null;
  opponentWpm: number;
  challengerWpm: number;
  won: boolean;
};

export type NotificationData =
  | AnnouncementData
  | PersonalBestData
  | OgGrantedData
  | FollowNotificationData
  | MutualNotificationData
  | FriendPbNotificationData
  | DuelChallengeData
  | DuelResultData
  | null;

export type Notification = {
  id: string;
  kind: NotificationKind | (string & {}); // open string lets unknown kinds round-trip
  title: string;
  body: string;
  data: NotificationData;
  /** ms — server epoch. */
  createdAtMs: number;
  /** ms when the user acknowledged it, or null while unread. */
  readAtMs: number | null;
};

export type ListNotificationsOutput = {
  items: Notification[];
  /** Server-computed count so the bell badge doesn't have to count
   *  client-side (and so it's correct even if `items` is capped at
   *  the list limit). */
  unreadCount: number;
};

export const markReadInputSchema = z.object({
  // Notification ids are UUIDv4 from the DB (36 chars). 64 leaves
  // headroom for any id-scheme change without exposing an unbounded
  // string vector.
  id: z.string().min(1).max(64),
});
export type MarkReadInput = z.infer<typeof markReadInputSchema>;
