import { parseUserTags, withUserTag } from "@/lib/user-tags";
import { USER_TAG_IDS, type UserTagId } from "@/types/user-tag";
import { DEV_SELF_GRANT_ENABLED, devSelfGrantTags } from "./dev-tag-grant";
import { isOwnerEmail } from "./owner-config";

/** Compute the *eligibility* set — the tags this user is allowed to
 *  display beside their name. Driven by Clerk publicMetadata (OG and
 *  any future grant-based tag) plus the OWNER email allowlist.
 *
 *  Eligibility is server-authoritative; the user can't claim a tag
 *  they're not eligible for. Display is a separate decision: the
 *  user picks which of their eligible tags to actually show via
 *  `profile.setTags`, and `applyTagSelection` produces the final
 *  list the UI renders.
 *
 *  In local development the owner additionally self-grants any
 *  preview-only tags (`whitehat` today) so the chip can be seen before
 *  it's manually granted to real users. This is a no-op on hosted
 *  deploys and under the test runner — see `dev-tag-grant.ts`. */
export function resolveEligibleTags(input: {
  email: string | null | undefined;
  publicMetadataTags: unknown;
}): UserTagId[] {
  let tags = parseUserTags(input.publicMetadataTags);
  if (isOwnerEmail(input.email)) {
    tags = withUserTag(tags, "owner");
  }
  for (const tag of devSelfGrantTags({
    email: input.email,
    enabled: DEV_SELF_GRANT_ENABLED,
  })) {
    tags = withUserTag(tags, tag);
  }
  return tags;
}

/** Apply the user's tag-display selection to their eligibility set.
 *
 *  Selection semantics:
 *    - `null` / `undefined` → no selection stored yet → show every
 *      eligible tag. Default for users who never visited the toggle
 *      UI, so the feature rollout doesn't strip tags retroactively.
 *    - `[]`                 → explicit "show none" → opt-out.
 *    - `[…ids]`             → return eligible ∩ selection in
 *      canonical order. Unknown ids in the selection are dropped.
 *
 *  Always returns a list in `USER_TAG_IDS` order so callers don't
 *  have to re-sort downstream. */
export function applyTagSelection(
  eligible: readonly UserTagId[],
  selection: readonly UserTagId[] | null | undefined,
): UserTagId[] {
  if (selection == null) return [...eligible];
  const wanted = new Set(selection);
  return USER_TAG_IDS.filter(
    (id) => eligible.includes(id) && wanted.has(id),
  );
}

/** Parse the freeform `selectedTags` slot out of a user-prefs blob.
 *  Returns null when the field is missing (treated as "no selection")
 *  or an array of valid tag ids when present. Invalid entries are
 *  filtered out silently — the prefs blob is client-controlled, so
 *  defensive parsing keeps the server stable against any shape the
 *  client might write. */
export function readTagSelection(prefs: unknown): UserTagId[] | null {
  if (!prefs || typeof prefs !== "object") return null;
  const raw = (prefs as Record<string, unknown>).selectedTags;
  if (raw == null) return null;
  const parsed = parseUserTags(raw);
  // parseUserTags returns [] for non-array or all-invalid input. We
  // need to distinguish "selectedTags: []" (opt-out) from "missing".
  // Treat actual array input as a real selection, even when empty.
  if (Array.isArray(raw)) return parsed;
  return null;
}

/** Back-compat alias for the old API.
 *  @deprecated Call `resolveEligibleTags` directly — the old name
 *  promised more than it delivered (it always returned eligibility,
 *  not "tags from Clerk"). */
export const resolveTagsFromClerkUser = resolveEligibleTags;
