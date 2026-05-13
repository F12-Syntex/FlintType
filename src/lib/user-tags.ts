import { isUserTagId, USER_TAG_IDS, type UserTagId } from "@/types/user-tag";

/** Coerce an unknown value — typically `clerkUser.publicMetadata.tags`
 *  or a JSON-decoded server payload — into a deduped list of known tag
 *  ids in canonical display order. Anything that isn't a known id is
 *  dropped; the function never throws.
 *
 *  Lower-cases incoming strings so external systems that store
 *  `"OG"` / `"Owner"` line up with our internal `og` / `owner` ids
 *  without a separate normalisation pass at every call site. */
export function parseUserTags(input: unknown): UserTagId[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<UserTagId>();
  for (const item of input) {
    const id = typeof item === "string" ? item.toLowerCase() : null;
    if (id != null && isUserTagId(id)) seen.add(id);
  }
  // Iterate the canonical order so the output is sorted the way the
  // UI expects regardless of how the caller assembled the input.
  return USER_TAG_IDS.filter((t) => seen.has(t));
}

/** Idempotently add a tag to an existing list, returning a new array
 *  in canonical display order. Useful at the grant site (e.g. the
 *  OG-1000 milestone) where we merge the new tag into whatever Clerk
 *  already stores. */
export function withUserTag(
  existing: readonly UserTagId[],
  tag: UserTagId,
): UserTagId[] {
  if (existing.includes(tag)) return USER_TAG_IDS.filter((t) => existing.includes(t));
  return parseUserTags([...existing, tag]);
}
