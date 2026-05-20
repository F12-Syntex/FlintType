import { randomUUID } from "node:crypto";
import { defineRoute } from "@/server";
import { BackendError } from "@/lib/errors";
import { resolveUserDisplays } from "@/server/user-display";
import {
  createDuelInputSchema,
  type CreateDuelInput,
  type CreateDuelOutput,
} from "@/types/duel";
import type { DuelChallengeData } from "@/types/notification";

/** Create a duel from a just-finished run. Duels are a *friends* (i.e.
 *  mutual-follow) feature, so the caller must be mutual with the
 *  opponent and unblocked. Snapshots the passage + trace and fires a
 *  `duel_challenge` notification to the opponent. */
export const create = defineRoute<CreateDuelInput, CreateDuelOutput>({
  input: createDuelInputSchema,
  handler: async ({ input, db, meta, log }) => {
    const me = meta.userId as string;
    const opp = input.opponentId;
    if (opp === me) {
      throw new BackendError(400, "VALIDATION", "You can't duel yourself.");
    }
    if (await db.blocks.eitherBlocks(me, opp)) {
      throw new BackendError(403, "FORBIDDEN", "You can't duel this user.");
    }
    if (!(await db.follows.isMutual(me, opp))) {
      throw new BackendError(
        403,
        "FORBIDDEN",
        "You can only duel friends — you both need to follow each other.",
      );
    }

    const displays = await resolveUserDisplays(db, [me, opp]);
    if (!displays.get(opp)) {
      throw new BackendError(404, "NOT_FOUND", "That user doesn't exist.");
    }
    const meD = displays.get(me);

    const id = randomUUID();
    await db.duels.create({
      id,
      challengerId: me,
      opponentId: opp,
      words: input.words,
      mode: input.mode,
      durationOrWordCount: input.durationOrWordCount,
      challengerWpm: input.wpm,
      challengerAccuracy: input.accuracy,
      challengerWpmHistory: input.wpmHistory ?? null,
    });

    await db.notifications.createIfAbsent({
      userId: opp,
      kind: "duel_challenge",
      title: "Duel challenge",
      body: `${meD?.name ?? "A friend"} dares you to beat ${Math.round(input.wpm)} wpm.`,
      data: {
        duelId: id,
        challengerId: me,
        challengerName: meD?.name ?? me,
        challengerUsername: meD?.username ?? null,
        challengerWpm: Math.round(input.wpm),
        mode: input.mode,
        durationOrWordCount: input.durationOrWordCount,
      } satisfies DuelChallengeData,
      dedupeKey: `duel:${id}`,
    });

    log.info("duel created", { duelId: id, challengerId: me, opponentId: opp });
    return { id };
  },
});
