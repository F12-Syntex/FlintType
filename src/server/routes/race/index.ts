import { BackendError } from "@/lib/errors";
import { defineNamespace, defineRoute } from "@/server";
import { getRaceIdentity } from "@/server/race/identity";
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
  handler: async ({ input }) => {
    const sessionToken = newSessionToken();
    const identity = await getRaceIdentity(sessionToken);
    // Seed off the wall clock — the room itself caches the seed so
    // every joiner of this room sees the same passage / bot motion.
    const seed = Date.now() | 0;
    const room = joinOrCreateMatchmaking(input.modeId, seed);
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
      const fresh = joinOrCreateMatchmaking(input.modeId, seed);
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

const keystroke = defineRoute<KeystrokeInput, KeystrokeOutput>({
  input: keystrokeInputSchema,
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
  handler: ({ input }) => {
    const room = getRoom(input.roomId);
    if (room) room.removeRacer(input.sessionToken);
    return { ok: true };
  },
});

/** Public race namespace. No `requireAuth` — anonymous users get
 *  `Guest · XYZ` labels via `getRaceIdentity` and can join matchmaking
 *  or challenge rooms identically to signed-in users. Rate-limit
 *  keeps a keystroke-firehose from drowning the server: at the
 *  client's ~6 Hz cadence over a 60s race ≈ 360 calls per minute, so
 *  600 leaves comfortable headroom for retries / dropped packets. */
export const race = defineNamespace({
  routes: { queue, keystroke, leave, challenge },
});
