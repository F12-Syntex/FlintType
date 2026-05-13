import { parseUserTags, withUserTag } from "@/lib/user-tags";
import type { UserTagId } from "@/types/user-tag";
import { isOwnerEmail } from "./owner-config";

/** Combine all tag sources for a user into a single canonical list.
 *
 *  Inputs:
 *    - `email`              → drives the OWNER tag via the email
 *                             allowlist in `owner-config.ts`.
 *    - `publicMetadataTags` → drives every other tag (today: OG).
 *                             Raw `unknown` because Clerk stores it
 *                             as jsonb; `parseUserTags` does the
 *                             coercion + dedupe.
 *
 *  The output is canonical-order (OWNER first if present, then OG)
 *  and free of unknown ids. */
export function resolveTagsFromClerkUser(input: {
  email: string | null | undefined;
  publicMetadataTags: unknown;
}): UserTagId[] {
  let tags = parseUserTags(input.publicMetadataTags);
  if (isOwnerEmail(input.email)) {
    tags = withUserTag(tags, "owner");
  }
  return tags;
}
