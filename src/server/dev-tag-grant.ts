import type { UserTagId } from "@/types/user-tag";
import { IS_DEV, IS_HOSTED_DEPLOY, IS_TEST } from "./env";
import { isOwnerEmail } from "./owner-config";

/** Tags the owner self-grants in *local development* so a brand-new
 *  tag can be previewed beside their own name before it's manually
 *  granted to any real user.
 *
 *  `whitehat` is grant-based in production: it becomes eligible the
 *  moment it appears in a user's Clerk `publicMetadata.tags` (added by
 *  hand in the Clerk dashboard once they've reported 3+ major bugs).
 *  There is no automatic grant path. This dev-only self-grant exists
 *  purely so the owner can see the chip render — it never fires on a
 *  hosted deploy or under the test runner. */
export const DEV_SELF_GRANT_TAGS: readonly UserTagId[] = ["whitehat"];

/** True only on a developer machine running `next dev`. False on any
 *  hosted deploy (VERCEL=1 / CI=true) and under vitest, so production
 *  eligibility is driven solely by Clerk metadata + the OWNER
 *  allowlist, and the resolve-tags unit tests stay deterministic. */
export const DEV_SELF_GRANT_ENABLED =
  IS_DEV && !IS_HOSTED_DEPLOY && !IS_TEST;

/** The dev-only self-granted tags for a given user. Empty unless
 *  `enabled` *and* the email belongs to the OWNER allowlist — the
 *  owner is the only one who self-grants ("let me give it to myself to
 *  preview it").
 *
 *  Pure: `enabled` is injected rather than read from the ambient env so
 *  both branches are testable regardless of how the suite is run. The
 *  one live caller (`resolveEligibleTags`) passes
 *  `DEV_SELF_GRANT_ENABLED`. */
export function devSelfGrantTags(input: {
  email: string | null | undefined;
  enabled: boolean;
}): UserTagId[] {
  if (!input.enabled) return [];
  if (!isOwnerEmail(input.email)) return [];
  return [...DEV_SELF_GRANT_TAGS];
}
