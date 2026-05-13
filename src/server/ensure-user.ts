import type { Database } from "@/db/server";
import type { UserRow } from "@/db/schema/server/users";
import { OG_MILESTONE_LIMIT } from "@/db/server/repositories/users";
import { BackendError } from "@/lib/errors";
import type { Logger } from "./logger";
import { grantOg } from "./og-grant";

export type EnsureUserContext = {
  meta: Record<string, unknown>;
  db: Database;
  log: Logger;
};

/** Lazily materialise the local mirror row for the authenticated user,
 *  and fire any pending OG-grant side-effects.
 *
 *  Side-effects (only when the row is eligible AND not yet granted):
 *    - If `seq <= OG_MILESTONE_LIMIT` and `ogGrantedAt == null`, run
 *      the grant pipeline: write the OG tag onto Clerk
 *      publicMetadata, fire the `og_granted` notification, then
 *      stamp `ogGrantedAt` so future visits skip the work.
 *
 *  This branch fires for BOTH first-time and retroactive grants —
 *  the moment an existing user (created before the OG feature
 *  shipped, or before the cap lowered) hits `ensureUser`, their next
 *  request runs the grant. The `ogGrantedAt` flag prevents repeated
 *  Clerk reads on subsequent visits.
 *
 *  Must be called from a handler downstream of `requireAuth` — the
 *  Clerk userId is read from `ctx.meta.userId`. Throws INTERNAL when
 *  that's absent so misuse fails loudly rather than silently
 *  materialising an anonymous row.
 *
 *  Fail-soft on DB errors: if the `users` mirror table doesn't exist
 *  yet (e.g. a fresh production deploy where the migration hasn't
 *  been applied), we log a warning and return null instead of
 *  crashing the parent route. The grant retries on the next request
 *  once the migration lands. Internal failures inside `grantOg` are
 *  separately swallowed (Clerk API hiccups should never break the
 *  parent request either).
 *
 *  Returns the user row on success, or null when the mirror is
 *  unreachable. Callers that don't need the row can ignore the
 *  return value either way. */
export async function ensureUser(
  ctx: EnsureUserContext,
): Promise<UserRow | null> {
  const userId = ctx.meta.userId as string | undefined;
  if (!userId) {
    throw new BackendError(
      500,
      "INTERNAL",
      "ensureUser called without an authenticated session",
    );
  }
  try {
    const { row } = await ctx.db.users.ensureForUser(userId);
    const eligible = row.seq <= OG_MILESTONE_LIMIT;
    const alreadyGranted = row.ogGrantedAt != null;
    if (eligible && !alreadyGranted) {
      await grantOg({ db: ctx.db, log: ctx.log }, userId, row.seq);
      // Even if `grantOg` swallowed a transient Clerk error, stamp
      // the flag — the notification path runs inside the same try
      // block and the dedupe key on the notification handles a
      // retry. The alternative (refusing to stamp until everything
      // succeeded) would hammer Clerk every visit if a single API
      // call ever 503'd. Worst case: a user's OG tag isn't on Clerk
      // but the local notification fired; they'll get the tag on
      // their next account update or re-grant flow.
      await ctx.db.users.markOgGranted(userId);
    }
    return row;
  } catch (err) {
    // Mirror table missing, transient DB outage, or any other write
    // failure: log + skip. The parent request still proceeds; the
    // worst-case impact is "OG grant is deferred to a later request"
    // which is acceptable for an identity-decoration feature.
    ctx.log.warn("ensureUser: mirror unavailable, skipping grant", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}
