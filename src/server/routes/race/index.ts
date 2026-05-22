import { BackendError } from "@/lib/errors";
import { defineNamespace, defineRoute } from "@/server";
import { rateLimit } from "@/server/middleware/rate-limit";
import { getRaceIdentity } from "@/server/race/identity";
import {
  raceHandler,
  requireRaceProxySecret,
} from "@/server/race/proxy";
import { pickRaceQuote } from "@/server/race/quotes";
import {
  evictFromMatchmaking,
  getRoom,
  joinOrCreateMatchmaking,
  newSessionToken,
} from "@/server/race/store";
import {
  type KeystrokeInput,
  type KeystrokeOutput,
  type LeaveInput,
  type LeaveOutput,
  type QueueInput,
  type QueueOutput,
  type RematchInput,
  type RematchOutput,
  keystrokeInputSchema,
  leaveInputSchema,
  queueInputSchema,
  rematchInputSchema,
} from "@/types/race";
import { challenge } from "./challenge";

const queue = defineRoute<QueueInput, QueueOutput>({
  input: queueInputSchema,
  middleware: [rateLimit({ limit: 120, windowMs: 60_000 })],
  handler: raceHandler<QueueInput, QueueOutput>(async ({ input }) => {
    const sessionToken = newSessionToken();
    const identity = await getRaceIdentity(sessionToken);
    // Seed off the wall clock — the room itself caches the seed so
    // every joiner of this room sees the same passage / bot motion.
    const seed = Date.now() | 0;
    // Every race draws from the MonkeyType english.json word list
    // — the same pool the single-player English mode uses. Quote
    // racing was retired so passages are always lowercase, no
    // punctuation. The server-side `pickRaceQuote` + quote pool
    // stays intact for when / if quote racing returns.
    const userId = identity.userId ?? undefined;
    const room = joinOrCreateMatchmaking(input.modeId, seed, undefined);
    const added = room.addRealRacer({
      sessionToken,
      name: identity.name,
      badge: identity.badge,
      userId,
    });
    if (!added) {
      // Race condition with the matchmaking-index lookup — the room
      // got locked between findOrCreate and addRealRacer. Recurse
      // once: with the previous room evicted, we'll get a fresh one.
      evictFromMatchmaking(room);
      const fresh = joinOrCreateMatchmaking(input.modeId, seed, undefined);
      const second = fresh.addRealRacer({
        sessionToken,
        name: identity.name,
        badge: identity.badge,
        userId,
      });
      if (!second) {
        throw new BackendError(
          503,
          "CONFLICT",
          "race queue is momentarily full, try again",
        );
      }
      return {
        roomId: fresh.id,
        sessionToken: second.sessionToken,
        words: fresh.words,
        totalChars: fresh.totalChars,
        modeId: fresh.modeId,
      };
    }
    return {
      roomId: room.id,
      sessionToken: added.sessionToken,
      words: room.words,
      totalChars: room.totalChars,
      modeId: room.modeId,
    };
  }),
});

/** Keystroke firehose — the client batches at ~6 Hz over a 60s race
 *  (~360 hits/min), so 600/min per IP leaves comfortable headroom for
 *  retries and dropped packets without letting a scripted abuser
 *  push every connected room into a hot-write loop. Per-IP keying is
 *  fine here because there's no auth and the route's authorisation
 *  is the (roomId, sessionToken) pair — the rate limit is a separate
 *  cap on raw call volume. */
const keystroke = defineRoute<KeystrokeInput, KeystrokeOutput>({
  input: keystrokeInputSchema,
  middleware: [rateLimit({ limit: 600, windowMs: 60_000 })],
  handler: raceHandler<KeystrokeInput, KeystrokeOutput>(({ input }) => {
    const room = getRoom(input.roomId);
    if (!room) {
      throw new BackendError(404, "NOT_FOUND", "race room not found");
    }
    const ok = room.setProgress(
      input.sessionToken,
      input.progressChars,
      input.wpm,
      input.finished ?? false,
      input.errors,
      input.accuracy,
    );
    if (!ok) {
      // Could be: wrong token (caller not in room), or race not yet
      // started, or bot id passed in. None of those need a 4xx —
      // gracefully ignore so the client's keystroke firehose doesn't
      // throw on every miss.
      return { ok: true };
    }
    return { ok: true };
  }),
});

const leave = defineRoute<LeaveInput, LeaveOutput>({
  input: leaveInputSchema,
  middleware: [rateLimit({ limit: 120, windowMs: 60_000 })],
  handler: raceHandler<LeaveInput, LeaveOutput>(({ input }) => {
    const room = getRoom(input.roomId);
    if (room) room.removeRacer(input.sessionToken);
    return { ok: true };
  }),
});

/** Vote to rematch. Idempotent — clicking twice yields the same
 *  ready-state. Server short-circuits to the new round the moment
 *  threshold is met; the response's `started` flag mirrors that so
 *  the client can flip its UI without waiting for the SSE snapshot.
 *
 *  Rate-limited per IP. 60/min is well above any honest click rate
 *  but keeps a script from spamming ready-votes to force-start
 *  rounds in rooms it doesn't belong to (the sessionToken check
 *  already prevents writes on rooms the caller hasn't joined). */
const rematch = defineRoute<RematchInput, RematchOutput>({
  input: rematchInputSchema,
  middleware: [rateLimit({ limit: 60, windowMs: 60_000 })],
  handler: raceHandler<RematchInput, RematchOutput>(({ input }) => {
    const room = getRoom(input.roomId);
    if (!room) {
      throw new BackendError(404, "NOT_FOUND", "race room not found");
    }
    const result = room.markRematchReady(input.sessionToken);
    if (!result.ok) {
      // Wrong phase, wrong token, or caller is a bot — gracefully
      // accept without writing. The UI doesn't need a 4xx for these
      // (clicking Rematch outside the post-finish window is the user
      // racing the snapshot, not a misuse).
      return { ok: true, started: false };
    }
    return { ok: true, started: result.started };
  }),
});

/** Public race namespace. No `requireAuth` — anonymous users get
 *  `Guest · XYZ` labels via `getRaceIdentity` and can join matchmaking
 *  or challenge rooms identically to signed-in users.
 *
 *  Rate limits are attached per-route rather than namespace-wide: the
 *  `keystroke` firehose needs its own 600/min budget (~360/min real
 *  load) and a namespace-wide 120/min would compose with it and
 *  bottleneck the firehose after ~20s. Every other race route carries
 *  its own 120/min cap; `challenge.*` does the same internally.
 *
 *  `requireRaceProxySecret` runs first so that on the authority
 *  instance (Railway) we reject any caller missing the shared
 *  secret. On proxy instances (Vercel) it's a no-op — the
 *  `raceHandler` wrapper short-circuits to the upstream fetch before
 *  any local store touch. */
export const race = defineNamespace({
  middleware: [requireRaceProxySecret],
  routes: { queue, keystroke, leave, rematch, challenge },
});
