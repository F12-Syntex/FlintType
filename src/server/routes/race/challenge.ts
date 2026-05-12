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
  type CreateChallengeInput,
  type CreateChallengeOutput,
  type JoinChallengeInput,
  type JoinChallengeOutput,
  type StartChallengeInput,
  type StartChallengeOutput,
  createChallengeInputSchema,
  joinChallengeInputSchema,
  startChallengeInputSchema,
} from "@/types/race";

const create = defineRoute<CreateChallengeInput, CreateChallengeOutput>({
  input: createChallengeInputSchema,
  handler: async ({ input }) => {
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
      throw new BackendError(
        409,
        "CONFLICT",
        "challenge lobby is full or has already started",
      );
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

export const challenge = defineNamespace({
  routes: { create, join, start },
});
