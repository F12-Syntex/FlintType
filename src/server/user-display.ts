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

/** Short-TTL cache for resolved displays, keyed by user id.
 *
 *  Why this exists. `resolveUserDisplays` runs a Clerk `getUserList`
 *  round-trip + a prefs read. The live-spectate paths poll it HARD —
 *  `live.watch` resolves the watched user ~once a second per spectator,
 *  and `friends.friendsLive` resolves the live set every ~5s per open
 *  hub tab. A user's display (handle, avatar, chosen tags) is static
 *  across a session, so re-fetching it every poll burns Clerk's rate
 *  budget and pads the Vercel function duration (duration is billed)
 *  with a network wait on the hottest endpoint. A 30s TTL turns a 1Hz
 *  watch poll into ~one Clerk call per 30s.
 *
 *  Correctness contract: any code path that changes a user's display
 *  (username update, tag-selection write) calls
 *  `invalidateUserDisplay(id)` so the next resolve re-fetches. The TTL
 *  bounds staleness even without invalidation — these surfaces are
 *  "other people" views where ≤30s lag on a renamed handle is fine. */
const DISPLAY_TTL_MS = 30_000;
const MAX_ENTRIES = 2_000;

type Entry = { display: UserDisplay; addedAt: number };
const cache = new Map<string, Entry>();

/** Drop the cached display for `id` so the next resolve re-fetches.
 *  Call after any write that changes a user-visible field. */
export function invalidateUserDisplay(id: string): void {
  cache.delete(id);
}

function put(display: UserDisplay): void {
  // Bounded by MAX_ENTRIES; Map iteration order is insertion order, so
  // the first key is the oldest by last-set time — drop it when full.
  if (cache.size >= MAX_ENTRIES && !cache.has(display.userId)) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  cache.delete(display.userId);
  cache.set(display.userId, { display, addedAt: Date.now() });
}

type ClerkUserLike = {
  id: string;
  username?: string | null;
  firstName?: string | null;
  emailAddresses?: { emailAddress: string }[] | null;
  publicMetadata?: Record<string, unknown> | null;
  imageUrl?: string | null;
};

function buildDisplay(
  u: ClerkUserLike,
  selection: ReturnType<typeof readTagSelection>,
): UserDisplay {
  // `emailAddresses` is always an array on a real Clerk user, but guard
  // the index defensively so a partial shape can't crash the batch.
  const email = u.emailAddresses?.[0]?.emailAddress;
  const raw = u.firstName ?? u.username ?? email?.split("@")[0] ?? "racer";
  const display = raw.startsWith("@") ? raw : `@${raw}`;
  const eligibleTags = resolveEligibleTags({
    email,
    publicMetadataTags: (u.publicMetadata as { tags?: unknown } | null)?.tags,
  });
  return {
    userId: u.id,
    username: u.username ?? null,
    name: display,
    tags: applyTagSelection(eligibleTags, selection),
    imageUrl: u.imageUrl ?? null,
  };
}

/** Resolve display info for a batch of Clerk user ids. Fresh cache
 *  entries are served without touching Clerk; only the cache misses go
 *  out as a single bulk `getUserList` + a single bulk prefs read, so a
 *  steady poll of an already-seen user makes zero Clerk calls.
 *
 *  Ids Clerk can't resolve (deleted users, bad ids) are simply absent
 *  from the returned map — callers filter them out the same way the
 *  leaderboard does, rather than rendering placeholders. Unresolved ids
 *  are not cached, so they're retried on the next call.
 *
 *  Error posture: a Clerk failure only throws when there's an actual
 *  miss to fetch — a fully-warm batch returns cached data even during a
 *  Clerk blip. When there IS a miss, the error is NOT swallowed:
 *  friend/lobby actions are authenticated and low-frequency, so a Clerk
 *  outage should surface as a normal failure the caller retries, not
 *  silently produce an empty result that looks like "no friends". */
export async function resolveUserDisplays(
  db: Database,
  userIds: readonly string[],
): Promise<Map<string, UserDisplay>> {
  const out = new Map<string, UserDisplay>();
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return out;

  const now = Date.now();
  const misses: string[] = [];
  for (const id of ids) {
    const hit = cache.get(id);
    if (hit && now - hit.addedAt < DISPLAY_TTL_MS) {
      out.set(id, hit.display);
    } else {
      misses.push(id);
    }
  }
  if (misses.length === 0) return out;

  const client = await clerkClient();
  const { data } = await client.users.getUserList({
    userId: misses,
    limit: misses.length,
  });
  // One bulk prefs read for the missed users so each user's tag-display
  // selection is honoured without an N+1.
  const prefsByUserId = await db.userPrefs.bulkGet(misses);

  for (const u of data) {
    const display = buildDisplay(u, readTagSelection(prefsByUserId.get(u.id)));
    out.set(u.id, display);
    put(display);
  }
  return out;
}

// Exposed for tests.
export function _resetUserDisplayCache(): void {
  cache.clear();
}

export function _userDisplayCacheSize(): number {
  return cache.size;
}
