import { BackendError } from "@/lib/errors";
import { defineNamespace, defineRoute } from "@/server";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { resolveUserDisplays } from "@/server/user-display";
import {
  inviteToLobbyInputSchema,
  type InviteToLobbyInput,
  type InviteToLobbyOutput,
} from "@/types/lobby";
import type { RaceInviteData } from "@/types/notification";

/** Notify a friend that you've opened a private race lobby for them.
 *  Racing a friend means a live lobby: the friend gets a "join my race"
 *  notification and races you in real time. Friends-only (mutual
 *  follow), block-gated, and deduped per lobby so a double-click can't
 *  double-notify. */
const invite = defineRoute<InviteToLobbyInput, InviteToLobbyOutput>({
  input: inviteToLobbyInputSchema,
  handler: async ({ input, db, meta, log }) => {
    const me = meta.userId as string;
    const opp = input.opponentId;
    if (opp === me) {
      throw new BackendError(400, "VALIDATION", "You can't invite yourself.");
    }
    if (await db.blocks.eitherBlocks(me, opp)) {
      throw new BackendError(403, "FORBIDDEN", "You can't invite this user.");
    }
    if (!(await db.follows.isMutual(me, opp))) {
      throw new BackendError(
        403,
        "FORBIDDEN",
        "You can only invite friends — you both need to follow each other.",
      );
    }

    const displays = await resolveUserDisplays(db, [me, opp]);
    if (!displays.get(opp)) {
      throw new BackendError(404, "NOT_FOUND", "That user doesn't exist.");
    }
    const meD = displays.get(me);

    await db.notifications.createIfAbsent({
      userId: opp,
      kind: "race_invite",
      title: "Race invite",
      body: `${meD?.name ?? "A friend"} opened a race lobby and invited you.`,
      data: {
        slug: input.slug,
        inviterId: me,
        inviterName: meD?.name ?? me,
        inviterUsername: meD?.username ?? null,
      } satisfies RaceInviteData,
      // One invite per (lobby, recipient) — a double-click can't spam.
      dedupeKey: `race_invite:${input.slug}:${opp}`,
    });

    log.info("race lobby invite sent", { slug: input.slug, from: me, to: opp });
    return { ok: true };
  },
});

export const lobby = defineNamespace({
  middleware: [requireAuth, rateLimit({ limit: 60, windowMs: 60_000 })],
  routes: { invite },
});
