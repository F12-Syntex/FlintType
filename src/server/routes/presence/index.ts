import { defineNamespace, defineRoute } from "@/server";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import {
  heartbeatInputSchema,
  type HeartbeatInput,
  type HeartbeatOutput,
  type PresenceEntry,
  type PresenceListOutput,
} from "@/types/presence";

/** A user is "online" if their last heartbeat landed within this
 *  window. A full 2× the ~30s client heartbeat interval, so a single
 *  missed beat (tab throttling on focus, a slow request) never flickers
 *  them offline — they'd have to miss two in a row. */
export const ONLINE_WINDOW_MS = 60_000;

/** Record the caller's heartbeat. Mounted globally on the client and
 *  fired every ~30s while a signed-in tab is visible. */
const heartbeat = defineRoute<HeartbeatInput, HeartbeatOutput>({
  input: heartbeatInputSchema,
  handler: async ({ input, db, meta }) => {
    await db.presence.heartbeat(meta.userId as string, input.status ?? "online");
    return { ok: true };
  },
});

/** Presence for everyone the caller follows. Offline users are omitted
 *  (the client treats a missing id as offline). */
const list = defineRoute<void, PresenceListOutput>({
  handler: async ({ db, meta }) => {
    const me = meta.userId as string;
    const followingIds = (await db.follows.listFollowing(me)).map(
      (e) => e.userId,
    );
    const rows = await db.presence.getForUsers(followingIds);
    const now = Date.now();
    const entries: PresenceEntry[] = rows.map((r) => {
      const lastSeenMs = r.lastSeenAt.getTime();
      return {
        userId: r.userId,
        online: now - lastSeenMs < ONLINE_WINDOW_MS,
        status: r.status,
        lastSeenMs,
      };
    });
    return { entries, windowMs: ONLINE_WINDOW_MS };
  },
});

/** Presence namespace — caller is always the signed-in user. The
 *  heartbeat budget is generous (a 30s heartbeat is 2/min; 120/min
 *  leaves headroom for the list poll + multiple tabs). */
export const presence = defineNamespace({
  middleware: [requireAuth, rateLimit({ limit: 120, windowMs: 60_000 })],
  routes: { heartbeat, list },
});
