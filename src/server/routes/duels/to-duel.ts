import type { DuelRow } from "@/db/schema/server/duels";
import type { UserDisplay } from "@/server/user-display";
import type { Duel, DuelParticipant } from "@/types/duel";

function participant(
  userId: string,
  d: UserDisplay | undefined,
): DuelParticipant {
  return {
    userId,
    username: d?.username ?? null,
    name: d?.name ?? userId,
    tags: d?.tags ?? [],
  };
}

/** Map a stored duel row + a resolved-display map into the wire `Duel`.
 *  Pure — the caller does the (batched) Clerk resolution and passes the
 *  map in, so listing N duels stays a single round-trip. */
export function toDuel(
  row: DuelRow,
  displays: Map<string, UserDisplay>,
): Duel {
  return {
    id: row.id,
    challenger: participant(row.challengerId, displays.get(row.challengerId)),
    opponent: participant(row.opponentId, displays.get(row.opponentId)),
    words: (row.words as string[] | null) ?? [],
    mode: row.mode,
    durationOrWordCount: row.durationOrWordCount,
    challengerWpm: row.challengerWpm,
    challengerAccuracy: row.challengerAccuracy,
    challengerWpmHistory: (row.challengerWpmHistory as number[] | null) ?? null,
    status: row.status,
    opponentWpm: row.opponentWpm ?? null,
    opponentAccuracy: row.opponentAccuracy ?? null,
    createdAtMs: row.createdAt.getTime(),
    completedAtMs: row.completedAt?.getTime() ?? null,
  };
}

/** Did the opponent's run beat the challenger's? Compared on net WPM
 *  (raw × accuracy), the same yardstick the leaderboard ranks by, so a
 *  sloppy fast run doesn't "win" over a clean one. */
export function opponentWon(challenger: { wpm: number; accuracy: number }, opponent: { wpm: number; accuracy: number }): boolean {
  const net = (w: number, a: number) => w * (Math.max(0, Math.min(100, a)) / 100);
  return net(opponent.wpm, opponent.accuracy) > net(challenger.wpm, challenger.accuracy);
}
