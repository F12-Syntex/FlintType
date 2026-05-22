/** Canonical user-tag ids known to the renderer.
 *
 *  Wire shape: `{ tags: UserTagId[] }` on every user-facing payload
 *  (leaderboard entry, profile owner, list entries). The literal
 *  union is closed — anything the server emits that isn't in this
 *  list is dropped at parse time (see `parseUserTags` in
 *  `src/lib/user-tags.ts`).
 *
 *  Display order matters. The array is the canonical "weight" order
 *  used both for sorting on the wire (highest authority first) and
 *  for paint order on the row (most authoritative tag leftmost beside
 *  the name). Adding a new tag requires extending this union AND the
 *  catalog in `src/components/ft/user-tag.tsx` AND the CSS tokens in
 *  `src/app/globals.css` AND a row in `docs/ui-law.md` §11 + §14 in
 *  the same commit. */
export const USER_TAG_IDS = ["owner", "whitehat", "og"] as const;
export type UserTagId = (typeof USER_TAG_IDS)[number];

export function isUserTagId(value: unknown): value is UserTagId {
  return (
    typeof value === "string" &&
    (USER_TAG_IDS as readonly string[]).includes(value)
  );
}
