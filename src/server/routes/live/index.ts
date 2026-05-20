import { defineNamespace, defineRoute } from "@/server";
import type { Database } from "@/db/server";
import { selfSpectateAllowed } from "@/server/live-self-spectate";
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
  type LiveSpectator,
  type SpectatorsOutput,
  type StopLiveOutput,
  type WatchInput,
  type WatchOutput,
} from "@/types/live";

/** A snapshot is "live" only while fresh — a broadcaster that stopped
 *  pushing (closed the tab, finished) ages out after this window
 *  without needing an explicit goodbye. ~8.5× the 700ms push cadence,
 *  so a couple of dropped pushes don't blink them offline. */
export const LIVE_TTL_MS = 6_000;

/** A spectator is "currently watching" while their `watch` poll is this
 *  fresh — ~5.7× the 700ms poll cadence. */
export const SPECTATOR_TTL_MS = 4_000;

/** The spectate consent slice on user-prefs. Sharing is **on by
 *  default** — only an explicit `enabled: false` turns it off — with an
 *  optional per-friend `blocked` denylist of viewers who may not watch. */
type SpectateSlice = { enabled?: boolean; blocked?: string[] };

function spectateSlice(prefs: { spectate?: unknown }): SpectateSlice | undefined {
  return prefs.spectate as SpectateSlice | undefined;
}

/** Global consent — on unless the user explicitly turned sharing off.
 *  Gates whether a broadcaster's pushes are stored at all. */
async function isSpectatable(db: Database, userId: string): Promise<boolean> {
  return spectateSlice(await db.userPrefs.get(userId))?.enabled !== false;
}

/** Whether `viewer` is allowed to watch `slice`'s owner: sharing on AND
 *  the viewer isn't on the per-friend denylist. */
function consentAllows(slice: SpectateSlice | undefined, viewer: string): boolean {
  if (slice?.enabled === false) return false;
  if (Array.isArray(slice?.blocked) && slice.blocked.includes(viewer)) {
    return false;
  }
  return true;
}

/** Broadcaster pushes its latest live state (~every 700ms while
 *  practicing). Stored only if the user has opted in — a `false`
 *  `accepted` tells the client to stop pushing. */
const progress = defineRoute<LiveProgressInput, LiveProgressOutput>({
  input: liveProgressInputSchema,
  handler: async ({ input, db, meta }) => {
    const me = meta.userId as string;
    if (!(await isSpectatable(db, me))) return { accepted: false, watchers: 0 };
    await db.liveSessions.set(me, {
      words: input.words,
      progressChars: input.progressChars,
      totalChars: input.totalChars,
      wpm: input.wpm,
      accuracy: input.accuracy,
      screen: input.screen,
    });
    // Tell the broadcaster how many people are watching, so it can stream
    // lazily — one indexed read, free on the push it already makes.
    const watchers = (await db.liveSpectators.listFor(me, SPECTATOR_TTL_MS))
      .length;
    return { accepted: true, watchers };
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
    // Dev-only: you may watch your own session (single-browser testing).
    // Everyone else still needs to be an unblocked mutual friend.
    const isSelf = target === me;
    if (isSelf && !selfSpectateAllowed()) return { live: false };
    if (!isSelf) {
      if (await db.blocks.eitherBlocks(me, target)) return { live: false };
      if (!(await db.follows.isMutual(me, target))) return { live: false };
    }
    // Sharing on (default) AND the viewer isn't on the target's denylist.
    if (!consentAllows(spectateSlice(await db.userPrefs.get(target)), me)) {
      return { live: false };
    }

    const entry = await db.liveSessions.get(target);
    if (!entry || Date.now() - entry.updatedAt.getTime() >= LIVE_TTL_MS) {
      return { live: false };
    }

    // Record that we're watching, so the broadcaster's spectator count
    // sees us (self-watch is a no-op in the repo).
    await db.liveSpectators.touch(target, me);

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
    // Dev-only: surface your own live session in your "Live now" so the
    // hub → watch flow is clickable without a second account.
    if (selfSpectateAllowed() && !ids.includes(me)) ids.push(me);
    if (ids.length === 0) return { users: [] };

    const [sessions, prefsById] = await Promise.all([
      db.liveSessions.getForUsers(ids),
      db.userPrefs.bulkGet(ids),
    ]);

    const now = Date.now();
    const liveIds = ids.filter((id) => {
      const entry = sessions.get(id);
      if (!entry || now - entry.updatedAt.getTime() >= LIVE_TTL_MS) return false;
      // Sharing on (default) and I'm not on their per-friend denylist.
      return consentAllows(spectateSlice(prefsById.get(id) ?? {}), me);
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

/** Who is watching me right now — drives the broadcaster's "N people
 *  are spectating" readout. Fresh spectators (within SPECTATOR_TTL_MS)
 *  resolved to display handles. */
const spectators = defineRoute<void, SpectatorsOutput>({
  handler: async ({ db, meta }) => {
    const me = meta.userId as string;
    const ids = await db.liveSpectators.listFor(me, SPECTATOR_TTL_MS);
    if (ids.length === 0) return { watchers: [] };
    const displays = await resolveUserDisplays(db, ids);
    const watchers: LiveSpectator[] = [];
    for (const id of ids) {
      const d = displays.get(id);
      if (d) watchers.push({ userId: id, name: d.name });
    }
    return { watchers };
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
  routes: { progress, watch, friendsLive, spectators, stop },
});
