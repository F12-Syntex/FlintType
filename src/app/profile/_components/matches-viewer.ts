/** The slice of Clerk's `useUser().user` the owner check reads. */
export type ViewerIdentity = {
  id?: string | null;
  username?: string | null;
  emailAddresses?: readonly { emailAddress: string }[] | null;
} | null | undefined;

/** True when the signed-in viewer owns the profile at `/profile/<urlUsername>`.
 *  No URL username (the bare /profile route) means "my profile". */
export function matchesViewer(
  urlUsername: string | undefined,
  user: ViewerIdentity,
): boolean {
  if (!user) return false;
  if (!urlUsername) return true;
  // Case-insensitive compare — Clerk preserves casing on usernames
  // but the auto-derived names from ensureUsername are lowercased,
  // so the same user could be reachable via either form depending
  // on which path generated the URL.
  const target = urlUsername.toLowerCase();
  const candidates = new Set<string>();
  if (user.username) candidates.add(user.username.toLowerCase());
  if (user.id) {
    candidates.add(user.id.toLowerCase());
    // Auto-derived fallback shape from ensureUsername when neither
    // an email nor a name is usable: `u_<first-12-of-userId>`.
    const tail = user.id.replace(/^user_/, "").slice(0, 12).toLowerCase();
    candidates.add(`u_${tail}`);
  }
  const email = user.emailAddresses?.[0]?.emailAddress;
  if (email) {
    const local = email.split("@")[0]?.toLowerCase();
    if (local) {
      candidates.add(local);
      // Sanitised form matching auto-username's derivation (dots /
      // plus / non-word chars → underscore, trim leading/trailing).
      candidates.add(
        local.replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, ""),
      );
    }
  }
  return candidates.has(target);
}
