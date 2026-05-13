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
 *  and fire any first-encounter side-effects.
 *
 *  Side-effects (only on the very first call for a user):
 *    - If the assigned `seq` is within `OG_MILESTONE_LIMIT`, grant the
 *      OG identity tag (writes Clerk `publicMetadata.tags` and fires
 *      an `og_granted` notification).
 *
 *  Must be called from a handler downstream of `requireAuth` — the
 *  Clerk userId is read from `ctx.meta.userId`. Throws INTERNAL when
 *  that's absent so misuse fails loudly rather than silently
 *  materialising an anonymous row.
 *
 *  The OG grant is awaited but failures inside it are swallowed (see
 *  `grantOg`); the parent request always succeeds. */
export async function ensureUser(ctx: EnsureUserContext): Promise<UserRow> {
  const userId = ctx.meta.userId as string | undefined;
  if (!userId) {
    throw new BackendError(
      500,
      "INTERNAL",
      "ensureUser called without an authenticated session",
    );
  }
  const { row, created } = await ctx.db.users.ensureForUser(userId);
  if (created && row.seq <= OG_MILESTONE_LIMIT) {
    await grantOg({ db: ctx.db, log: ctx.log }, userId, row.seq);
  }
  return row;
}
