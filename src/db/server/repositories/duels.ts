import { and, desc, eq } from "drizzle-orm";
import { duels, type DuelRow } from "@/db/schema/server/duels";
import type { ServerDrizzle } from "../driver";

export type CreateDuelInput = {
  id: string;
  challengerId: string;
  opponentId: string;
  words: string[];
  mode: string;
  durationOrWordCount: number;
  challengerWpm: number;
  challengerAccuracy: number;
  challengerWpmHistory: number[] | null;
};

export function duelsRepo(db: ServerDrizzle) {
  return {
    async create(input: CreateDuelInput): Promise<DuelRow> {
      const [row] = await db
        .insert(duels)
        .values({
          id: input.id,
          challengerId: input.challengerId,
          opponentId: input.opponentId,
          words: input.words,
          mode: input.mode,
          durationOrWordCount: input.durationOrWordCount,
          challengerWpm: input.challengerWpm,
          challengerAccuracy: input.challengerAccuracy,
          challengerWpmHistory: input.challengerWpmHistory,
          status: "pending",
        })
        .returning();
      if (!row) throw new Error("duels.create returned no row");
      return row;
    },

    async findById(id: string): Promise<DuelRow | null> {
      const rows = await db
        .select()
        .from(duels)
        .where(eq(duels.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    /** Duels where `userId` is the opponent (challenges they received),
     *  newest first. */
    async listIncoming(userId: string): Promise<DuelRow[]> {
      return db
        .select()
        .from(duels)
        .where(eq(duels.opponentId, userId))
        .orderBy(desc(duels.createdAt));
    },

    /** Duels `userId` issued, newest first. */
    async listOutgoing(userId: string): Promise<DuelRow[]> {
      return db
        .select()
        .from(duels)
        .where(eq(duels.challengerId, userId))
        .orderBy(desc(duels.createdAt));
    },

    /** Record the opponent's result and flip the duel to `completed`.
     *  Guarded so only the named opponent of a still-pending duel can
     *  write — returns the updated row, or null when the duel doesn't
     *  exist / isn't theirs / is already complete (the `where` filters
     *  all three and an empty RETURNING signals it). */
    async recordResult(opts: {
      id: string;
      opponentId: string;
      wpm: number;
      accuracy: number;
    }): Promise<DuelRow | null> {
      const updated = await db
        .update(duels)
        .set({
          status: "completed",
          opponentWpm: opts.wpm,
          opponentAccuracy: opts.accuracy,
          completedAt: new Date(),
        })
        .where(
          and(
            eq(duels.id, opts.id),
            eq(duels.opponentId, opts.opponentId),
            eq(duels.status, "pending"),
          ),
        )
        .returning();
      return updated[0] ?? null;
    },
  };
}

export type DuelsRepo = ReturnType<typeof duelsRepo>;
