import type { clerkClient } from "@clerk/nextjs/server";

import { invalidateCachedClerkUser } from "./clerk-user-cache";
import type { Logger } from "./logger";

const MIN_LEN = 4;
const MAX_LEN = 30;
const MAX_COLLISION_RETRIES = 50;

/** Derive a Clerk-valid username candidate from a Clerk user. Prefers
 *  the email local-part (most distinctive), falls back to the combined
 *  first/last name, then the trailing slug of the Clerk userId.
 *
 *  Output rules:
 *    - lowercase
 *    - only `[a-z0-9_]` (Clerk also allows `-`; we normalise dots and
 *      every other non-word char to `_` so the candidate is always
 *      Clerk-shaped)
 *    - 4-30 chars (Clerk's published lower bound is 4; the upper is
 *      our own cap so collision suffixes fit)
 *    - no leading/trailing `_`
 *
 *  Pure — no I/O. Safe to unit-test. */
export function deriveUsernameCandidate(opts: {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  userId: string;
}): string {
  const sanitize = (s: string): string =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, MAX_LEN);

  const localPart = opts.email?.split("@")[0] ?? "";
  let candidate = sanitize(localPart);
  if (candidate.length < MIN_LEN) {
    const name = sanitize(`${opts.firstName ?? ""}${opts.lastName ?? ""}`);
    if (name.length >= MIN_LEN) candidate = name;
  }
  if (candidate.length < MIN_LEN) {
    // Last resort: derive from the Clerk userId. Strip the `user_`
    // prefix Clerk adds, lowercase, take the first 12 chars and
    // prefix `u_` so it doesn't read as an opaque hash.
    const slug = opts.userId.replace(/^user_/, "").slice(0, 12).toLowerCase();
    candidate = sanitize(`u_${slug}`);
  }
  return candidate.slice(0, MAX_LEN);
}

/** Ensure the given Clerk user has a username assigned. Returns the
 *  username (existing or newly-assigned), or `null` if assignment
 *  failed after exhausting collision retries.
 *
 *  Idempotent: skips the update + collision walk when the user
 *  already has a username. Safe to call on every `/profile` redirect
 *  without burning Clerk quota — once a username exists, this is a
 *  zero-write fast path.
 *
 *  Collision handling: Clerk enforces username uniqueness at the
 *  API level (it rejects `updateUser` with a 422 when the username
 *  is taken). We loop appending `_2`, `_3`, … until acceptance or
 *  retry limit. Swallows the per-attempt error and tries the next
 *  candidate. */
export async function ensureUsername(
  client: Awaited<ReturnType<typeof clerkClient>>,
  userId: string,
  log: Logger,
): Promise<string | null> {
  const user = await client.users.getUser(userId);
  if (user.username && user.username.length > 0) return user.username;
  const base = deriveUsernameCandidate({
    email: user.emailAddresses[0]?.emailAddress,
    firstName: user.firstName,
    lastName: user.lastName,
    userId,
  });
  for (let suffix = 0; suffix < MAX_COLLISION_RETRIES; suffix++) {
    const candidate =
      suffix === 0
        ? base
        : `${base.slice(0, MAX_LEN - String(suffix + 1).length - 1)}_${suffix + 1}`;
    try {
      const updated = await client.users.updateUser(userId, {
        username: candidate,
      });
      // Symmetric with profile.updateUsername — if anything cached the
      // pre-write Clerk user (no username), drop it so the next read
      // re-fetches the assigned value.
      invalidateCachedClerkUser(userId);
      log.info("auto-username: assigned", { userId, username: candidate });
      return updated.username ?? candidate;
    } catch {
      // Most likely cause: username taken (Clerk 422). Any failure
      // moves on to the next candidate; we don't introspect Clerk's
      // error shape because the response varies by SDK version and
      // the only useful recovery is "try another name".
      continue;
    }
  }
  log.warn("auto-username: exhausted retries", { userId, base });
  return null;
}
