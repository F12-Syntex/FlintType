import { clerkClient } from "@clerk/nextjs/server";
import type { Database } from "@/db/server";
import { BackendError } from "@/lib/errors";
import type { Logger } from "@/server/logger";
import {
  applyTagSelection,
  readTagSelection,
  resolveEligibleTags,
} from "@/server/resolve-tags";
import type { SharedTest } from "@/types/share";
import type { UserTagId } from "@/types/user-tag";

/** Shared loader for a single shareable test, used by both the
 *  `share.get` route and the `/r/[testId]` page chrome (page metadata
 *  + the dynamic OG image route).
 *
 *  Authorisation model: shareable === completed. Anyone with the test
 *  id (a server-minted UUIDv4 from `adapt.submit`) gets the public
 *  projection. Incomplete runs throw NOT_FOUND so a shared card never
 *  represents an abandoned test.
 *
 *  Identity lookup is best-effort: a Clerk outage downgrades handle
 *  to `@racer` and avatar to `null` rather than failing the load —
 *  the share link is the user's, the chrome is decoration. */
export async function loadSharedTest(
  db: Database,
  testId: string,
  log: Logger,
): Promise<SharedTest> {
  const row = await db.tests.findById(testId);
  if (!row || !row.wasCompleted) {
    throw new BackendError(
      404,
      "NOT_FOUND",
      `No shareable test for ${testId}`,
    );
  }

  let handle = "@racer";
  let username: string | null = null;
  let avatarUrl: string | null = null;
  let eligibleTags: UserTagId[] = [];
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(row.userId);
    const raw =
      user.firstName ??
      user.username ??
      user.emailAddresses[0]?.emailAddress?.split("@")[0] ??
      "racer";
    handle = raw.startsWith("@") ? raw : `@${raw}`;
    username = user.username ?? null;
    if (user.hasImage && user.imageUrl) avatarUrl = user.imageUrl;
    eligibleTags = resolveEligibleTags({
      email: user.emailAddresses[0]?.emailAddress,
      publicMetadataTags: (user.publicMetadata as { tags?: unknown } | null)
        ?.tags,
    });
  } catch (err) {
    log.warn("share.load: clerk getUser failed", {
      testId,
      userId: row.userId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  const prefs = await db.userPrefs.get(row.userId);
  const tags = applyTagSelection(eligibleTags, readTagSelection(prefs));

  const completedAtMs = row.completedAt?.getTime() ?? row.startedAt.getTime();
  const durationSec = Math.max(
    1,
    Math.round((completedAtMs - row.startedAt.getTime()) / 1_000),
  );

  return {
    testId: row.id,
    mode: row.mode,
    durationOrWordCount: row.durationOrWordCount,
    wpm: row.wpm,
    accuracy: row.accuracy,
    errorCount: row.errorCount,
    durationSec,
    completedAtMs,
    handle,
    username,
    avatarUrl,
    tags,
  };
}
