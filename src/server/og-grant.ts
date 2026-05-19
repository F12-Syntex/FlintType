import { clerkClient } from "@clerk/nextjs/server";
import type { Database } from "@/db/server";
import { OG_MILESTONE_LIMIT } from "@/db/server/repositories/users";
import { parseUserTags, withUserTag } from "@/lib/user-tags";
import { invalidateCachedClerkUser } from "./clerk-user-cache";
import type { Logger } from "./logger";

export type OgGrantContext = {
  db: Database;
  log: Logger;
};

/** Best-effort grant of the OG identity tag.
 *
 *  Two side-effects, both idempotent:
 *    1. Write `publicMetadata.tags = withUserTag(current, "og")` on
 *       Clerk. Existing publicMetadata fields (e.g. `role`) are
 *       preserved. Skipped when the user already has the OG tag.
 *    2. Create a single `og_granted` notification, deduped by the
 *       kind on the user so retries never double-fire.
 *
 *  Failures are swallowed — the parent request must succeed even if
 *  Clerk is briefly down. The grant retries naturally on the user's
 *  next encounter only if the local mirror row was just created;
 *  otherwise the retry path is the admin/janitor that backfills
 *  missed grants (not built yet — first-call success is the design
 *  contract).
 *
 *  This helper does **not** check eligibility (seq <= milestone). That
 *  decision lives in `ensureUser` so this function stays a pure
 *  side-effect runner the admin path can also call. */
export async function grantOg(
  ctx: OgGrantContext,
  userId: string,
  seq: number,
): Promise<void> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const meta = (user.publicMetadata ?? {}) as Record<string, unknown>;
    const currentTags = parseUserTags(meta.tags);
    if (!currentTags.includes("og")) {
      const nextTags = withUserTag(currentTags, "og");
      await client.users.updateUserMetadata(userId, {
        publicMetadata: { ...meta, tags: nextTags },
      });
      // The cached user.publicMetadata.tags would otherwise miss the
      // new OG entry until the TTL elapses.
      invalidateCachedClerkUser(userId);
    }
    await ctx.db.notifications.createIfAbsent({
      userId,
      kind: "og_granted",
      title: "You're OG.",
      body: `You're among the first ${OG_MILESTONE_LIMIT} flinttype users — the OG tag now sits beside your name everywhere your profile shows up.`,
      data: { seq, milestoneLimit: OG_MILESTONE_LIMIT },
      dedupeKey: "og",
    });
    ctx.log.info("og-grant ok", { userId, seq });
  } catch (err) {
    ctx.log.warn("og-grant failed", {
      userId,
      seq,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
