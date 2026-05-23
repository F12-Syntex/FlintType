import type { FriendUser } from "@/types/friends";
import type { LiveFriend } from "@/types/live";
import type { PresenceEntry } from "@/types/presence";
import type { DockChallenge } from "./use-dock-data";

/** Dev-only fake data for the friends dock, so the live / presence /
 *  challenge UI can be exercised without a populated Clerk instance and a
 *  real follow graph. Friend display resolves through Clerk's
 *  `getUserList`, which drops fake ids, so a DB seed wouldn't render here;
 *  this injects at the view layer instead.
 *
 *  Every call site is gated behind `process.env.NODE_ENV ===
 *  "development"`, so this module is dead-code-eliminated from production
 *  builds. Ids are `dev_*` so they can never collide with a real `user_*`
 *  Clerk id, and the real follow graph always wins on a clash. */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const monthsAgo = (n: number) => Date.now() - n * 30 * DAY;

type Rel = "mutual" | "following";

type DummyPerson = {
  user: FriendUser;
  rel: Rel;
  presence?: { online: boolean; status: PresenceEntry["status"]; agoMs: number };
  live?: { wpm: number; progressChars: number; totalChars: number };
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

/** One roster driving every section so the directory, presence map, and
 *  live list stay consistent: two broadcasters, a few online, and the
 *  offline relative-time ramp. */
const ROSTER: DummyPerson[] = [
  {
    user: person("maya", 14, ["og"]),
    rel: "mutual",
    presence: { online: true, status: "practicing", agoMs: 0 },
    live: { wpm: 96, progressChars: 52, totalChars: 130 },
  },
  {
    user: person("theo", 9, ["owner"]),
    rel: "mutual",
    presence: { online: true, status: "racing", agoMs: 0 },
    live: { wpm: 71, progressChars: 88, totalChars: 100 },
  },
  {
    user: person("ines", 6),
    rel: "mutual",
    presence: { online: true, status: "practicing", agoMs: 0 },
  },
  {
    user: person("kit", 2),
    rel: "following",
    presence: { online: true, status: "online", agoMs: 0 },
  },
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
    user: person("ozz", 8),
    rel: "following",
    presence: { online: false, status: "online", agoMs: 47 * DAY },
  },
];

function merge(real: FriendUser[], dummy: FriendUser[]): FriendUser[] {
  const seen = new Set(real.map((u) => u.userId));
  return [...real, ...dummy.filter((u) => !seen.has(u.userId))];
}

type Lists = { friends: FriendUser[]; following: FriendUser[] };

export function withDummyLists(real: Lists): Lists {
  const friends = ROSTER.filter((d) => d.rel === "mutual").map((d) => d.user);
  const following = ROSTER.map((d) => d.user);
  return {
    friends: merge(real.friends, friends),
    following: merge(real.following, following),
  };
}

export function withDummyLive(real: LiveFriend[]): LiveFriend[] {
  const seen = new Set(real.map((u) => u.userId));
  const dummy = ROSTER.filter((d) => d.live).map((d) => ({
    userId: d.user.userId,
    username: d.user.username,
    name: d.user.name,
    tags: d.user.tags,
    imageUrl: d.user.imageUrl,
    wpm: d.live!.wpm,
    accuracy: 97,
    progressChars: d.live!.progressChars,
    totalChars: d.live!.totalChars,
  }));
  return [...real, ...dummy.filter((u) => !seen.has(u.userId))];
}

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

/** A couple of pending race-lobby invites so the dock's Challenges
 *  section is visible in dev (real wins on id). */
export function withDummyChallenges(real: DockChallenge[]): DockChallenge[] {
  const dummy: DockChallenge[] = [
    {
      id: "dev_inv1",
      slug: "dev-lobby-maya",
      inviterId: "dev_maya",
      inviterName: "@maya",
      inviterUsername: "maya",
    },
    {
      id: "dev_inv2",
      slug: "dev-lobby-ozz",
      inviterId: "dev_ozz",
      inviterName: "@ozz",
      inviterUsername: "ozz",
    },
  ];
  const seen = new Set(real.map((d) => d.id));
  return [...real, ...dummy.filter((d) => !seen.has(d.id))];
}
