import { randomBytes } from "node:crypto";
import { BackendError } from "@/lib/errors";
import type { RaceModeId, RaceWordList } from "@/types/race";
import { RaceRoom } from "./room";
import { generateSlug } from "./slug";

/** Hard ceiling on live rooms hosted by this process. Each room
 *  costs a few KB (racer slots, timers, subscriber list) so 1000 is
 *  ~10MB worst-case — well within a single Railway Hobby instance
 *  (8GB) but high enough that honest concurrent usage never touches
 *  it. Past the ceiling, fresh creates 503 so a flood of
 *  challenge-create requests can't OOM the box. Matchmaking is
 *  bucketed per-mode (one room per mode at a time) so the cap
 *  mainly defends against challenge spam. */
export const MAX_LIVE_ROOMS = 1000;

/** Process-wide registry of live race rooms.
 *
 *  CAVEAT — in-memory only. The store survives between requests on
 *  the same Node.js function instance and dies when Vercel cold-
 *  starts a new one. Two protections currently:
 *
 *    1. Region pinning. Both the dispatcher (/api/[...path]) and the
 *       SSE stream (/api/race/stream/[roomId]) export
 *       `preferredRegion = 'iad1'`, forcing POST /race/queue and
 *       GET /api/race/stream/<id> onto the same function pool.
 *       Without this, the queue lands in (say) lhr1 and the stream
 *       in iad1 — second region has no record of the room → 404.
 *    2. The store reads/writes through `globalThis.__flinttype_race_store__`
 *       so HMR + multiple module-graph copies in the same process
 *       still share state.
 *
 *  These cover Hobby / single-region Pro deployments. The proper fix
 *  is Redis/KV (Vercel KV, Upstash). The store's public surface is
 *  already async-friendly so the swap is mechanical when the time
 *  comes — `getRoom`, `joinOrCreateMatchmaking`, `createChallengeRoom`
 *  become async, the room itself stays in-process for the live
 *  bot-tick loop with state replicated to KV on transitions. */

type GlobalStore = {
  byId: Map<string, RaceRoom>;
  bySlug: Map<string, RaceRoom>;
  /** matchmaking rooms still accepting joiners, keyed by mode. */
  matchmakingByMode: Map<RaceModeId, RaceRoom>;
};

const GLOBAL_KEY = "__flinttype_race_store__";

function getStore(): GlobalStore {
  const g = globalThis as unknown as Record<string, unknown>;
  let store = g[GLOBAL_KEY] as GlobalStore | undefined;
  if (!store) {
    store = {
      byId: new Map(),
      bySlug: new Map(),
      matchmakingByMode: new Map(),
    };
    g[GLOBAL_KEY] = store;
  }
  return store;
}

function newRoomId(): string {
  return `r_${randomBytes(8).toString("hex")}`;
}

export function newSessionToken(): string {
  return `s_${randomBytes(12).toString("hex")}`;
}

export function getRoom(roomId: string): RaceRoom | null {
  return getStore().byId.get(roomId) ?? null;
}

export function getRoomBySlug(slug: string): RaceRoom | null {
  return getStore().bySlug.get(slug.toLowerCase()) ?? null;
}

/** Find an existing matchmaking room for the mode with capacity to
 *  spare, or create a fresh one. Real-player priority falls out of
 *  the lookup: this fn always returns an *existing* room first if
 *  one is open, which is where the bot-fill schedule is already
 *  running with seats reserved. */
export function joinOrCreateMatchmaking(
  modeId: RaceModeId,
  raceSeed: number,
  /** Passage override — used by quote rooms whose passage comes from
   *  the curated quote pool rather than the random word generator.
   *  Ignored on the join path (we always join the existing room, even
   *  if the caller would have proposed a different quote). */
  passage?: { text: string; source: string },
): RaceRoom {
  const store = getStore();
  const existing = store.matchmakingByMode.get(modeId);
  if (existing && existing.canJoinAsReal()) return existing;
  if (store.byId.size >= MAX_LIVE_ROOMS) {
    throw new BackendError(
      503,
      "CONFLICT",
      "race service is at capacity, try again shortly",
      { liveRooms: store.byId.size, cap: MAX_LIVE_ROOMS },
    );
  }
  const id = newRoomId();
  const room = new RaceRoom({
    id,
    slug: null,
    kind: "matchmaking",
    modeId,
    raceSeed,
    wordCount: 25,
    quoteText: passage?.text,
    quoteSource: passage?.source,
    onIdle: () => {
      store.byId.delete(id);
      if (store.matchmakingByMode.get(modeId) === room) {
        store.matchmakingByMode.delete(modeId);
      }
    },
  });
  store.byId.set(id, room);
  store.matchmakingByMode.set(modeId, room);
  return room;
}

/** Drop a room from the matchmaking index the moment it leaves the
 *  matching phase so the next joiner doesn't get stuck waiting on a
 *  locked lobby. Safe to call multiple times. */
export function evictFromMatchmaking(room: RaceRoom): void {
  const store = getStore();
  if (store.matchmakingByMode.get(room.modeId) === room) {
    store.matchmakingByMode.delete(room.modeId);
  }
}

export function createChallengeRoom(opts: {
  modeId: RaceModeId;
  raceSeed: number;
  /** Host-chosen passage length (word-count races). */
  wordCount?: number;
  /** Host-chosen word pool. */
  wordList?: RaceWordList;
  /** When set, the challenge is a timed race of this many seconds. */
  durationSec?: number;
  /** Passage override — used by quote rooms whose passage comes from
   *  the curated quote pool. */
  passage?: { text: string; source: string };
}): RaceRoom {
  const store = getStore();
  if (store.byId.size >= MAX_LIVE_ROOMS) {
    throw new BackendError(
      503,
      "CONFLICT",
      "race service is at capacity, try again shortly",
      { liveRooms: store.byId.size, cap: MAX_LIVE_ROOMS },
    );
  }
  const id = newRoomId();
  const slug = generateSlug(new Set(store.bySlug.keys()));
  const room = new RaceRoom({
    id,
    slug,
    kind: "challenge",
    modeId: opts.modeId,
    raceSeed: opts.raceSeed,
    wordCount: opts.wordCount ?? 25,
    wordList: opts.wordList,
    durationSec: opts.durationSec,
    quoteText: opts.passage?.text,
    quoteSource: opts.passage?.source,
    onIdle: () => {
      store.byId.delete(id);
      store.bySlug.delete(slug);
    },
  });
  store.byId.set(id, room);
  store.bySlug.set(slug, room);
  return room;
}

/** Wipe the store. Used by tests; never call from app code. */
export function __resetStoreForTests(): void {
  const store = getStore();
  for (const room of store.byId.values()) room.dispose();
  store.byId.clear();
  store.bySlug.clear();
  store.matchmakingByMode.clear();
}
