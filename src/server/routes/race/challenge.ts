import { BackendError } from "@/lib/errors";
import { defineNamespace, defineRoute } from "@/server";
import { getRaceIdentity } from "@/server/race/identity";
import {
  createChallengeRoom,
  getRoom,
  getRoomBySlug,
  newSessionToken,
} from "@/server/race/store";
import {
  type CancelChallengeInput,
  type CancelChallengeOutput,
  type CreateChallengeInput,
  type CreateChallengeOutput,
  type JoinChallengeInput,
  type JoinChallengeOutput,
  type StartChallengeInput,
  type StartChallengeOutput,
  cancelChallengeInputSchema,
  createChallengeInputSchema,
  joinChallengeInputSchema,
  startChallengeInputSchema,
} from "@/types/race";

const create = defineRoute<CreateChallengeInput, CreateChallengeOutput>({
  input: createChallengeInputSchema,
  handler: async ({ input }) => {
    // Burst races don't have a server-driven multiplayer flow — the
    // burst surface is local-only (each client runs its own reducer).
    // Letting a host create a burst challenge would mint a sharable
    // slug whose joiners would silently land in their own isolated
    // local lobby. Reject at the door so the URL semantics stay
    // honest: every challenge slug points at a real shared room.
    if (input.modeId === "burst") {
      throw new BackendError(
        400,
        "VALIDATION",
        "burst races don't support shared challenges",
      );
    }
    const sessionToken = newSessionToken();
    const identity = await getRaceIdentity(sessionToken);
    const seed = Date.now() | 0;
    const room = createChallengeRoom({ modeId: input.modeId, raceSeed: seed });
    const racer = room.addRealRacer({
      sessionToken,
      name: identity.name,
      badge: identity.badge,
      isHost: true,
    });
    if (!racer) {
      throw new BackendError(
        500,
        "INTERNAL",
        "challenge room rejected its own host — should never happen",
      );
    }
    return {
      roomId: room.id,
      slug: room.slug!,
      sessionToken,
      words: room.words,
      totalChars: room.totalChars,
      modeId: room.modeId,
    };
  },
});

const join = defineRoute<JoinChallengeInput, JoinChallengeOutput>({
  input: joinChallengeInputSchema,
  handler: async ({ input }) => {
    const room = getRoomBySlug(input.slug);
    if (!room) {
      throw new BackendError(
        404,
        "NOT_FOUND",
        `no challenge with slug "${input.slug}"`,
      );
    }
    const sessionToken = newSessionToken();
    const identity = await getRaceIdentity(sessionToken);
    const racer = room.addRealRacer({
      sessionToken,
      name: identity.name,
      badge: identity.badge,
    });
    if (!racer) {
      // Room is full or past the lobby phase. Instead of 409-ing
      // the caller out, hand them a read-only spectator response —
      // they can still see the race unfold via SSE. The client
      // gates writes (keystroke, leave, start) on `spectate=false`.
      return {
        roomId: room.id,
        sessionToken: "",
        words: room.words,
        totalChars: room.totalChars,
        modeId: room.modeId,
        spectate: true,
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

const start = defineRoute<StartChallengeInput, StartChallengeOutput>({
  input: startChallengeInputSchema,
  handler: ({ input }) => {
    const room = getRoom(input.roomId);
    if (!room) {
      throw new BackendError(404, "NOT_FOUND", "race room not found");
    }
    if (room.kind !== "challenge") {
      throw new BackendError(
        400,
        "VALIDATION",
        "only challenge rooms can be host-started",
      );
    }
    const ok = room.hostStart(input.sessionToken);
    if (!ok) {
      throw new BackendError(
        403,
        "FORBIDDEN",
        "only the room host can start a challenge race",
      );
    }
    return { ok: true };
  },
});

const cancel = defineRoute<CancelChallengeInput, CancelChallengeOutput>({
  input: cancelChallengeInputSchema,
  handler: ({ input }) => {
    const room = getRoom(input.roomId);
    if (!room) {
      throw new BackendError(404, "NOT_FOUND", "race room not found");
    }
    if (room.kind !== "challenge") {
      throw new BackendError(
        400,
        "VALIDATION",
        "only challenge rooms can be host-cancelled",
      );
    }
    const ok = room.hostCancel(input.sessionToken);
    if (!ok) {
      // Either the caller isn't the host, or the room is already past
      // finished. Both are FORBIDDEN from the caller's perspective —
      // they can't change this room's state. The finer-grained reason
      // doesn't need to leak.
      throw new BackendError(
        403,
        "FORBIDDEN",
        "only the room host can cancel a challenge",
      );
    }
    return { ok: true };
  },
});

export const challenge = defineNamespace({
  routes: { create, join, start, cancel },
});
