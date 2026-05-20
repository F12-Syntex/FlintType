import { clerkClient } from "@clerk/nextjs/server";
import type { Database } from "@/db/server";
import {
  applyTagSelection,
  readTagSelection,
  resolveEligibleTags,
} from "@/server/resolve-tags";
import type { UserTagId } from "@/types/user-tag";

/** The display-facing projection of a user: the `@handle`, the
 *  lower-case username for profile links, and the identity tags they
 *  have chosen to show. This is the same shape the leaderboard builds
 *  inline; the friends surfaces share it through this helper so the
 *  Clerk bulk-fetch + tag-resolution logic lives in exactly one place
 *  for new code. */
export type UserDisplay = {
  userId: string;
  username: string | null;
  /** Display name as `@handle` (firstName / username / email local
   *  part, in that order, prefixed with `@`). */
  name: string;
  tags: UserTagId[];
  /** Clerk avatar URL. Clerk always returns one (a generated initials
   *  default when the user has no upload), so this is reliably present;
   *  null only when Clerk couldn't resolve the user at all. */
  imageUrl: string | null;
};

/** Resolve display info for a batch of Clerk user ids in a single
 *  round-trip. Ids Clerk can't resolve (deleted users, bad ids) are
 *  simply absent from the returned map — callers filter them out the
 *  same way the leaderboard does, rather than rendering placeholders.
 *
 *  Unlike the leaderboard's inline copy, this does NOT swallow Clerk
 *  errors: friend actions are authenticated and low-frequency, so a
 *  Clerk outage should surface as a normal failure the caller retries,
 *  not silently produce an empty result that looks like "no friends". */
export async function resolveUserDisplays(
  db: Database,
  userIds: readonly string[],
): Promise<Map<string, UserDisplay>> {
  const out = new Map<string, UserDisplay>();
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return out;

  const client = await clerkClient();
  const { data } = await client.users.getUserList({
    userId: ids,
    limit: ids.length,
  });
  // One bulk prefs read for the whole batch so each user's tag-display
  // selection is honoured without an N+1.
  const prefsByUserId = await db.userPrefs.bulkGet(ids);

  for (const u of data) {
    // `emailAddresses` is always an array on a real Clerk user, but
    // guard the index defensively so a partial shape can't crash the
    // whole batch.
    const email = u.emailAddresses?.[0]?.emailAddress;
    const raw =
      u.firstName ?? u.username ?? email?.split("@")[0] ?? "racer";
    const display = raw.startsWith("@") ? raw : `@${raw}`;
    const eligibleTags = resolveEligibleTags({
      email,
      publicMetadataTags: (u.publicMetadata as { tags?: unknown } | null)?.tags,
    });
    const selection = readTagSelection(prefsByUserId.get(u.id));
    out.set(u.id, {
      userId: u.id,
      username: u.username ?? null,
      name: display,
      tags: applyTagSelection(eligibleTags, selection),
      imageUrl: u.imageUrl ?? null,
    });
  }
  return out;
}
