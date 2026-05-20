import { defineNamespace, defineRoute } from "@/server";
import type { Database } from "@/db/server";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { resolveUserDisplays } from "@/server/user-display";
import {
  liveProgressInputSchema,
  watchInputSchema,
  type FriendsLiveOutput,
  type LiveFriend,
  type LiveProgressInput,
  type LiveProgressOutput,
  type StopLiveOutput,
  type WatchInput,
  type WatchOutput,
} from "@/types/live";

/** A snapshot is "live" only while fresh — a broadcaster that stopped
 *  pushing (closed the tab, finished) ages out after this window
 *  without needing an explicit goodbye. ~8.5× the 700ms push cadence,
 *  so a couple of dropped pushes don't blink them offline. */
export const LIVE_TTL_MS = 6_000;

/** Consent gate: a user is spectatable only if they've explicitly
 *  opted in (user-prefs `spectate.enabled === true`). Default off. The
 *  pref is an object slice because the client writes it through
 *  `useRemotePrefs`, which stores slices (objects), not scalars. */
async function isSpectatable(db: Database, userId: string): Promise<boolean> {
  const prefs = await db.userPrefs.get(userId);
  const slice = prefs.spectate as { enabled?: boolean } | undefined;
  return slice?.enabled === true;
}

/** Broadcaster pushes its latest live state (~every 700ms while
 *  practicing). Stored only if the user has opted in — a `false`
 *  `accepted` tells the client to stop pushing. */
const progress = defineRoute<LiveProgressInput, LiveProgressOutput>({
  input: liveProgressInputSchema,
  handler: async ({ input, db, meta }) => {
    const me = meta.userId as string;
    if (!(await isSpectatable(db, me))) return { accepted: false };
    await db.liveSessions.set(me, {
      words: input.words,
      progressChars: input.progressChars,
      totalChars: input.totalChars,
      wpm: input.wpm,
      accuracy: input.accuracy,
    });
    return { accepted: true };
  },
});

/** Spectator poll. Returns `{ live: false }` for every "can't watch"
 *  case — not mutual friends, blocked, target hasn't opted in, or the
 *  target isn't currently practicing — so nothing about the target
 *  leaks to someone who shouldn't see it. */
const watch = defineRoute<WatchInput, WatchOutput>({
  input: watchInputSchema,
  handler: async ({ input, db, meta }) => {
    const me = meta.userId as string;
    const target = input.userId;
    if (target === me) return { live: false };
    if (await db.blocks.eitherBlocks(me, target)) return { live: false };
    if (!(await db.follows.isMutual(me, target))) return { live: false };
    if (!(await isSpectatable(db, target))) return { live: false };

    const entry = await db.liveSessions.get(target);
    if (!entry || Date.now() - entry.updatedAt.getTime() >= LIVE_TTL_MS) {
      return { live: false };
    }

    const displays = await resolveUserDisplays(db, [target]);
    const d = displays.get(target);
    return {
      live: true,
      subject: {
        userId: target,
        username: d?.username ?? null,
        name: d?.name ?? target,
        tags: d?.tags ?? [],
        imageUrl: d?.imageUrl ?? null,
      },
      snapshot: entry.snapshot,
      updatedAtMs: entry.updatedAt.getTime(),
    };
  },
});

/** Which of the caller's mutual friends are broadcasting right now —
 *  the friends-hub "live now" section. One pass over the friend set:
 *  batch-fetch their live rows + their spectate prefs, keep the ones
 *  that are fresh AND opted in, then resolve display + avatar for that
 *  (usually small) subset. No per-friend block check is needed: a block
 *  severs the follow edges, so a blocked user can't be mutual. */
const friendsLive = defineRoute<void, FriendsLiveOutput>({
  handler: async ({ db, meta }) => {
    const me = meta.userId as string;
    const friends = await db.follows.listFriends(me);
    const ids = friends.map((e) => e.userId);
    if (ids.length === 0) return { users: [] };

    const [sessions, prefsById] = await Promise.all([
      db.liveSessions.getForUsers(ids),
      db.userPrefs.bulkGet(ids),
    ]);

    const now = Date.now();
    const liveIds = ids.filter((id) => {
      const entry = sessions.get(id);
      if (!entry || now - entry.updatedAt.getTime() >= LIVE_TTL_MS) return false;
      const slice = prefsById.get(id)?.spectate as
        | { enabled?: boolean }
        | undefined;
      return slice?.enabled === true;
    });
    if (liveIds.length === 0) return { users: [] };

    const displays = await resolveUserDisplays(db, liveIds);
    const users: LiveFriend[] = [];
    for (const id of liveIds) {
      const d = displays.get(id);
      const entry = sessions.get(id);
      if (!d || !entry) continue;
      const s = entry.snapshot;
      users.push({
        userId: id,
        username: d.username,
        name: d.name,
        tags: d.tags,
        imageUrl: d.imageUrl,
        wpm: s.wpm,
        accuracy: s.accuracy,
        progressChars: s.progressChars,
        totalChars: s.totalChars,
      });
    }
    // Most-recently-active first — the freshest run reads as "most live".
    users.sort(
      (a, b) =>
        (sessions.get(b.userId)?.updatedAt.getTime() ?? 0) -
        (sessions.get(a.userId)?.updatedAt.getTime() ?? 0),
    );
    return { users };
  },
});

/** Broadcaster stops broadcasting (left the live surface). */
const stop = defineRoute<void, StopLiveOutput>({
  handler: async ({ db, meta }) => {
    await db.liveSessions.clear(meta.userId as string);
    return { ok: true };
  },
});

/** Live-spectate namespace. The budget covers a ~1.4/s push + a
 *  ~1.4/s spectator poll comfortably (240/min per user). */
export const live = defineNamespace({
  middleware: [requireAuth, rateLimit({ limit: 240, windowMs: 60_000 })],
  routes: { progress, watch, friendsLive, stop },
});
