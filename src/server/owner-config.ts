/** Emails of users who carry the OWNER identity tag.
 *
 *  Hardcoded allowlist — the OWNER tag is permanent and the catalog
 *  is small (one entry today). Resolution is email-based rather than
 *  Clerk-userId-based so the constant doesn't go stale if the
 *  underlying user is re-created or the project is re-keyed; the
 *  authoritative answer is "whoever signs in with this email".
 *
 *  Server-only by convention (lives under src/server/). The constant
 *  isn't sensitive — the user_id ↔ email mapping is already
 *  observable from any leaderboard entry where the owner appears —
 *  but keeping it off the client avoids the build-time export
 *  proliferating into bundles that don't need it.
 *
 *  Adding a co-owner = add their lowercase email here. */
export const OWNER_EMAILS: readonly string[] = [
  "eng.saifkhan2003@gmail.com",
];

/** True when the given email belongs to a user in the OWNER allowlist.
 *  Case-insensitive. Returns false on null/undefined input so callers
 *  can pipe Clerk's `emailAddresses[0]?.emailAddress` in directly. */
export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.toLowerCase());
}
