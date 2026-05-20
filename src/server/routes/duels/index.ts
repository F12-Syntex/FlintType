import { defineNamespace, defineRoute } from "@/server";
import { BackendError } from "@/lib/errors";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { resolveUserDisplays } from "@/server/user-display";
import {
  duelIdSchema,
  type DuelIdInput,
  type GetDuelOutput,
  type ListDuelsOutput,
} from "@/types/duel";
import { create } from "./create";
import { submitResult } from "./submit-result";
import { toDuel } from "./to-duel";

/** Load one duel. Only its two participants may view it (the passage
 *  is the opponent's to-type material). */
const get = defineRoute<DuelIdInput, GetDuelOutput>({
  input: duelIdSchema,
  handler: async ({ input, db, meta }) => {
    const me = meta.userId as string;
    const row = await db.duels.findById(input.id);
    if (!row) throw new BackendError(404, "NOT_FOUND", "Duel not found.");
    if (row.challengerId !== me && row.opponentId !== me) {
      throw new BackendError(403, "FORBIDDEN", "This duel isn't yours.");
    }
    const displays = await resolveUserDisplays(db, [
      row.challengerId,
      row.opponentId,
    ]);
    return toDuel(row, displays);
  },
});

/** The caller's duels: `incoming` (challenges to them) + `outgoing`
 *  (challenges they sent), newest first, with both sides' display info
 *  resolved in a single batch. */
const list = defineRoute<void, ListDuelsOutput>({
  handler: async ({ db, meta }) => {
    const me = meta.userId as string;
    const [incoming, outgoing] = await Promise.all([
      db.duels.listIncoming(me),
      db.duels.listOutgoing(me),
    ]);
    const ids = new Set<string>();
    for (const d of [...incoming, ...outgoing]) {
      ids.add(d.challengerId);
      ids.add(d.opponentId);
    }
    const displays = await resolveUserDisplays(db, [...ids]);
    return {
      incoming: incoming.map((d) => toDuel(d, displays)),
      outgoing: outgoing.map((d) => toDuel(d, displays)),
    };
  },
});

/** Duels namespace — every action is by the signed-in user. */
export const duels = defineNamespace({
  middleware: [requireAuth, rateLimit({ limit: 60, windowMs: 60_000 })],
  routes: { create, get, submitResult, list },
});
