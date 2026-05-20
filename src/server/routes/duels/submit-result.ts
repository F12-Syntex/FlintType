import { defineRoute } from "@/server";
import { BackendError } from "@/lib/errors";
import { resolveUserDisplays } from "@/server/user-display";
import {
  submitDuelResultSchema,
  type SubmitDuelResultInput,
  type SubmitDuelResultOutput,
} from "@/types/duel";
import type { DuelResultData } from "@/types/notification";
import { opponentWon, toDuel } from "./to-duel";

/** Record the opponent's run for a duel and notify the challenger.
 *  Only the named opponent of a still-pending duel can write — the
 *  repo's guarded update returns null otherwise, which we map to 404
 *  (no such duel) or 403 (not yours / already done). */
export const submitResult = defineRoute<
  SubmitDuelResultInput,
  SubmitDuelResultOutput
>({
  input: submitDuelResultSchema,
  handler: async ({ input, db, meta, log }) => {
    const me = meta.userId as string;
    const updated = await db.duels.recordResult({
      id: input.id,
      opponentId: me,
      wpm: input.wpm,
      accuracy: input.accuracy,
    });
    if (!updated) {
      const exists = await db.duels.findById(input.id);
      if (!exists) {
        throw new BackendError(404, "NOT_FOUND", "Duel not found.");
      }
      throw new BackendError(
        403,
        "FORBIDDEN",
        "You can't submit a result for this duel.",
      );
    }

    const displays = await resolveUserDisplays(db, [
      updated.challengerId,
      updated.opponentId,
    ]);
    const oppD = displays.get(updated.opponentId);
    const won = opponentWon(
      { wpm: updated.challengerWpm, accuracy: updated.challengerAccuracy },
      { wpm: input.wpm, accuracy: input.accuracy },
    );

    await db.notifications.createIfAbsent({
      userId: updated.challengerId,
      kind: "duel_result",
      title: won ? "Your run was beaten" : "Your run held up",
      body: `${oppD?.name ?? "Your opponent"} ${won ? "beat" : "couldn't beat"} your ${Math.round(updated.challengerWpm)} wpm (${Math.round(input.wpm)} wpm).`,
      data: {
        duelId: updated.id,
        opponentId: updated.opponentId,
        opponentName: oppD?.name ?? updated.opponentId,
        opponentUsername: oppD?.username ?? null,
        opponentWpm: Math.round(input.wpm),
        challengerWpm: Math.round(updated.challengerWpm),
        won,
      } satisfies DuelResultData,
      dedupeKey: `duel_result:${updated.id}`,
    });

    log.info("duel completed", { duelId: updated.id, won });
    return toDuel(updated, displays);
  },
});
