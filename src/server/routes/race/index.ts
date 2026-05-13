import { BackendError } from "@/lib/errors";
import { defineNamespace, defineRoute } from "@/server";
import { rateLimit } from "@/server/middleware/rate-limit";
import { getRaceIdentity } from "@/server/race/identity";
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
  keystrokeInputSchema,
  leaveInputSchema,
  queueInputSchema,
} from "@/types/race";
import { challenge } from "./challenge";

const queue = defineRoute<QueueInput, QueueOutput>({
  input: queueInputSchema,
  middleware: [rateLimit({ limit: 120, windowMs: 60_000 })],
  handler: async ({ input }) => {
    const sessionToken = newSessionToken();
    const identity = await getRaceIdentity(sessionToken);
    // Seed off the wall clock — the room itself caches the seed so
    // every joiner of this room sees the same passage / bot motion.
    const seed = Date.now() | 0;
    // Quote rooms swap the random-word passage for a curated medium-
    // length quote so every racer types the same line + author. The
    // pick happens at *create* time only — joining an existing room
    // doesn't re-roll the quote.
    const passage =
      input.modeId === "quote" ? pickRaceQuote() : undefined;
    const room = joinOrCreateMatchmaking(input.modeId, seed, passage);
    const added = room.addRealRacer({
      sessionToken,
      name: identity.name,
      badge: identity.badge,
    });
    if (!added) {
      // Race condition with the matchmaking-index lookup — the room
      // got locked between findOrCreate and addRealRacer. Recurse
      // once: with the previous room evicted, we'll get a fresh one.
      evictFromMatchmaking(room);
      const fresh = joinOrCreateMatchmaking(input.modeId, seed, passage);
      const second = fresh.addRealRacer({
        sessionToken,
        name: identity.name,
        badge: identity.badge,
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
        sessionToken,
        words: fresh.words,
        totalChars: fresh.totalChars,
        modeId: fresh.modeId,
      };
    }
    return {
      roomId: room.id,
      sessionToken,
      words: room.words,
      totalChars: room.totalChars,
      modeId: room.modeId,
    };
  },
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
  handler: ({ input }) => {
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
  },
});

const leave = defineRoute<LeaveInput, LeaveOutput>({
  input: leaveInputSchema,
  middleware: [rateLimit({ limit: 120, windowMs: 60_000 })],
  handler: ({ input }) => {
    const room = getRoom(input.roomId);
    if (room) room.removeRacer(input.sessionToken);
    return { ok: true };
  },
});

/** Public race namespace. No `requireAuth` — anonymous users get
 *  `Guest · XYZ` labels via `getRaceIdentity` and can join matchmaking
 *  or challenge rooms identically to signed-in users.
 *
 *  Rate limits are attached per-route rather than namespace-wide: the
 *  `keystroke` firehose needs its own 600/min budget (~360/min real
 *  load) and a namespace-wide 120/min would compose with it and
 *  bottleneck the firehose after ~20s. Every other race route carries
 *  its own 120/min cap; `challenge.*` does the same internally. */
export const race = defineNamespace({
  routes: { queue, keystroke, leave, challenge },
});
