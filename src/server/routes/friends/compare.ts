import { defineRoute } from "@/server";
import { BackendError } from "@/lib/errors";
import { resolveUserDisplays } from "@/server/user-display";
import {
  friendTargetSchema,
  type CompareOutput,
  type CompareSide,
  type FriendTargetInput,
} from "@/types/friends";

/** Head-to-head: the caller's flinttype aggregates against `userId`'s.
 *  Both sides come from completed local runs (not MonkeyType-merged),
 *  so it reads as "you two, on flinttype". 404s an unknown target;
 *  400s a self-compare. */
export const compare = defineRoute<FriendTargetInput, CompareOutput>({
  input: friendTargetSchema,
  handler: async ({ input, db, meta }) => {
    const me = meta.userId as string;
    const them = input.userId;
    if (them === me) {
      throw new BackendError(400, "VALIDATION", "Nothing to compare here.");
    }

    const displays = await resolveUserDisplays(db, [me, them]);
    const themDisplay = displays.get(them);
    if (!themDisplay) {
      throw new BackendError(404, "NOT_FOUND", "That user doesn't exist.");
    }
    const meDisplay = displays.get(me);

    const [meStats, themStats] = await Promise.all([
      db.tests.userStats(me),
      db.tests.userStats(them),
    ]);

    const meSide: CompareSide = {
      userId: me,
      username: meDisplay?.username ?? null,
      name: meDisplay?.name ?? "You",
      tags: meDisplay?.tags ?? [],
      stats: meStats,
    };
    const themSide: CompareSide = {
      userId: them,
      username: themDisplay.username,
      name: themDisplay.name,
      tags: themDisplay.tags,
      stats: themStats,
    };
    return { me: meSide, them: themSide };
  },
});
