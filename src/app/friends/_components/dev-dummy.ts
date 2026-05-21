import type { FriendUser } from "@/types/friends";
import type { LiveFriend } from "@/types/live";
import type {
  FollowNotificationData,
  FriendPbNotificationData,
  MutualNotificationData,
  Notification,
} from "@/types/notification";
import type { PresenceEntry } from "@/types/presence";

/** Dev-only fake data for the friends hub, so the presence / last-online
 *  UI can be exercised without a populated Clerk instance and a real
 *  follow graph. Friend display resolves through Clerk's `getUserList`,
 *  which drops fake ids — so a DB seed wouldn't render here. This injects
 *  at the view layer instead.
 *
 *  Every call site is gated behind `process.env.NODE_ENV ===
 *  "development"`, so this module is dead-code-eliminated from production
 *  builds. Ids are `dev_*` so they can never collide with a real `user_*`
 *  Clerk id, and the real follow graph always wins on a clash. */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Roughly N months ago — for the join date ("since") caption. */
const monthsAgo = (n: number) => Date.now() - n * 30 * DAY;

type Rel = "mutual" | "following" | "follower";

type DummyPerson = {
  user: FriendUser;
  /** Where the row appears: mutual = friends + following + followers;
   *  following = I follow them only; follower = they follow me only. */
  rel: Rel;
  /** Presence entry (only for people I follow — `rel` mutual/following).
   *  `agoMs` is how long since their last heartbeat. */
  presence?: { online: boolean; status: PresenceEntry["status"]; agoMs: number };
  /** When set, the person is also broadcasting a live run. */
  live?: { wpm: number; accuracy: number; progressChars: number; totalChars: number };
};

const person = (
  handle: string,
  sinceMonths: number,
  tags: FriendUser["tags"] = [],
): FriendUser => ({
  userId: `dev_${handle}`,
  username: handle,
  name: `@${handle}`,
  tags,
  imageUrl: null,
  sinceMs: monthsAgo(sinceMonths),
});

/** One roster that drives every section, so the lists, presence map, and
 *  live list all stay consistent. Tuned to exercise every branch: live,
 *  online + practising / racing / plain, offline across the whole
 *  relative-time ramp (minutes → absolute date), and a follower with no
 *  presence (the "since" fallback). */
const ROSTER: DummyPerson[] = [
  // Live now — broadcasting a run.
  {
    user: person("maya", 14, ["og"]),
    rel: "mutual",
    presence: { online: true, status: "practicing", agoMs: 0 },
    live: { wpm: 96, accuracy: 0.98, progressChars: 52, totalChars: 130 },
  },
  {
    user: person("theo", 9, ["owner"]),
    rel: "mutual",
    presence: { online: true, status: "racing", agoMs: 0 },
    live: { wpm: 71, accuracy: 0.95, progressChars: 88, totalChars: 100 },
  },
  // Online, not broadcasting — the "Online" strip.
  {
    user: person("ines", 6),
    rel: "mutual",
    presence: { online: true, status: "practicing", agoMs: 0 },
  },
  {
    user: person("dao", 4),
    rel: "mutual",
    presence: { online: true, status: "racing", agoMs: 0 },
  },
  {
    user: person("kit", 2),
    rel: "following",
    presence: { online: true, status: "online", agoMs: 0 },
  },
  // Offline — across the whole relative-time ramp.
  {
    user: person("sol", 11),
    rel: "mutual",
    presence: { online: false, status: "online", agoMs: 4 * MIN },
  },
  {
    user: person("wren", 7),
    rel: "mutual",
    presence: { online: false, status: "practicing", agoMs: 2 * HOUR },
  },
  {
    user: person("juno", 5),
    rel: "mutual",
    presence: { online: false, status: "online", agoMs: 3 * DAY },
  },
  {
    user: person("cass", 3),
    rel: "following",
    presence: { online: false, status: "online", agoMs: 16 * DAY },
  },
  {
    user: person("ozz", 8),
    rel: "following",
    presence: { online: false, status: "online", agoMs: 47 * DAY },
  },
  // Follows me, I don't follow back → no presence → "since" fallback.
  { user: person("bex", 1), rel: "follower" },
];

function mergeUsers(real: FriendUser[], dummy: FriendUser[]): FriendUser[] {
  const seen = new Set(real.map((u) => u.userId));
  return [...real, ...dummy.filter((u) => !seen.has(u.userId))];
}

type Lists = {
  friends: FriendUser[];
  following: FriendUser[];
  followers: FriendUser[];
};

/** Append the dummy roster to the three real lists (real wins on id). */
export function withDummyLists(real: Lists): Lists {
  const mutual = ROSTER.filter((d) => d.rel === "mutual").map((d) => d.user);
  const following = ROSTER.filter(
    (d) => d.rel === "mutual" || d.rel === "following",
  ).map((d) => d.user);
  const followers = ROSTER.filter(
    (d) => d.rel === "mutual" || d.rel === "follower",
  ).map((d) => d.user);
  return {
    friends: mergeUsers(real.friends, mutual),
    following: mergeUsers(real.following, following),
    followers: mergeUsers(real.followers, followers),
  };
}

/** Append the dummy broadcasters to the real live list (real wins). */
export function withDummyLive(real: LiveFriend[]): LiveFriend[] {
  const seen = new Set(real.map((u) => u.userId));
  const dummy = ROSTER.filter((d) => d.live).map((d) => ({
    userId: d.user.userId,
    username: d.user.username,
    name: d.user.name,
    tags: d.user.tags,
    imageUrl: d.user.imageUrl,
    wpm: d.live!.wpm,
    accuracy: d.live!.accuracy,
    progressChars: d.live!.progressChars,
    totalChars: d.live!.totalChars,
  }));
  return [...real, ...dummy.filter((u) => !seen.has(u.userId))];
}

/** Add dummy presence entries to the real map (real wins). Timestamps
 *  are computed fresh each call so "Active Nm ago" stays current. */
export function withDummyPresence(
  real: Map<string, PresenceEntry>,
): Map<string, PresenceEntry> {
  const out = new Map(real);
  const now = Date.now();
  for (const d of ROSTER) {
    if (!d.presence || out.has(d.user.userId)) continue;
    out.set(d.user.userId, {
      userId: d.user.userId,
      online: d.presence.online,
      status: d.presence.status,
      lastSeenMs: now - d.presence.agoMs,
    });
  }
  return out;
}

/** Prepend a few dummy activity items to the real feed (newest first). */
export function withDummyFeed(real: Notification[]): Notification[] {
  const now = Date.now();
  const pb: FriendPbNotificationData = {
    friendId: "dev_maya",
    friendName: "@maya",
    friendUsername: "maya",
    mode: "words",
    durationOrWordCount: 50,
    wpm: 112,
    accuracy: 0.98,
  };
  const mutual: MutualNotificationData = {
    friendId: "dev_theo",
    friendName: "@theo",
    friendUsername: "theo",
  };
  const follow: FollowNotificationData = {
    followerId: "dev_bex",
    followerName: "@bex",
    followerUsername: "bex",
  };
  const dummy: Notification[] = [
    {
      id: "dev_n1",
      kind: "friend_pb",
      title: "@maya hit a new personal best",
      body: "112 wpm at 98% on words. Six faster than her old best.",
      data: pb,
      createdAtMs: now - 8 * MIN,
      readAtMs: null,
    },
    {
      id: "dev_n2",
      kind: "mutual",
      title: "You and @theo are now friends",
      body: "You follow each other now. Challenge them to a duel.",
      data: mutual,
      createdAtMs: now - 3 * HOUR,
      readAtMs: now - 2 * HOUR,
    },
    {
      id: "dev_n3",
      kind: "follow",
      title: "@bex followed you",
      body: "Follow back to become friends.",
      data: follow,
      createdAtMs: now - 26 * HOUR,
      readAtMs: null,
    },
  ];
  const seen = new Set(real.map((n) => n.id));
  return [...real, ...dummy.filter((n) => !seen.has(n.id))].sort(
    (a, b) => b.createdAtMs - a.createdAtMs,
  );
}
