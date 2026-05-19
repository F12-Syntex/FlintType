import { clerkClient } from "@clerk/nextjs/server";

type ClerkUser = Awaited<
  ReturnType<Awaited<ReturnType<typeof clerkClient>>["users"]["getUser"]>
>;

/** Small TTL+LRU cache for Clerk `getUser` reads.
 *
 *  Why this exists. Public-traffic surfaces — `/r/<id>` share pages,
 *  social-preview crawlers, public profile views — each call Clerk on
 *  every request. Without a cache, a single Twitter card or Discord
 *  embed expansion burns a Clerk API quota slot. At the volumes a
 *  successful share gets in the first hour, that comfortably exceeds
 *  Clerk's burst budget.
 *
 *  This cache covers the "by-id" lookup path only. Bulk
 *  `getUserList({ userId: [...] })` (leaderboard) is already a single
 *  API call per page render; not cached here. Username lookups
 *  (`getUserList({ username: [...] })`) require a separate
 *  username→id mapping, deferred.
 *
 *  Correctness contract: any code path that *writes* to Clerk for a
 *  given user (username update, publicMetadata edit) must call
 *  `invalidateCachedClerkUser(id)` after the write so the next read
 *  re-fetches. The cache is opt-in — call sites reach for
 *  `getCachedClerkUser` explicitly. The bare `clerkClient().users.getUser`
 *  path stays uncached, so write-then-read patterns inside a single
 *  handler don't accidentally serve stale data unless they explicitly
 *  opt into the cache. */
const TTL_MS = 60_000;
const MAX_ENTRIES = 1_000;

type Entry = { user: ClerkUser; addedAt: number };
const cache = new Map<string, Entry>();

/** Hit the cache for a Clerk user by id. Misses fetch from Clerk and
 *  populate the cache. Returns null on Clerk error (call sites that
 *  treat the lookup as best-effort already tolerate null). */
export async function getCachedClerkUser(
  id: string,
): Promise<ClerkUser | null> {
  const now = Date.now();
  const hit = cache.get(id);
  if (hit && now - hit.addedAt < TTL_MS) {
    // LRU touch: move to back of insertion order so it survives the
    // next eviction sweep ahead of older idle entries.
    cache.delete(id);
    cache.set(id, hit);
    return hit.user;
  }
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(id);
    put(user);
    return user;
  } catch {
    return null;
  }
}

/** Drop the cached entry for `id` so the next `getCachedClerkUser`
 *  call goes back to Clerk. Call after any write that changes a
 *  user-visible field (username, publicMetadata, image). */
export function invalidateCachedClerkUser(id: string): void {
  cache.delete(id);
}

function put(user: ClerkUser): void {
  // Bounded by MAX_ENTRIES. Map iteration order is insertion order, so
  // the first key is the oldest by last-set time — drop it when full.
  if (cache.size >= MAX_ENTRIES && !cache.has(user.id)) {
    const first = cache.keys().next().value;
    if (first !== undefined) cache.delete(first);
  }
  cache.delete(user.id);
  cache.set(user.id, { user, addedAt: Date.now() });
}

// Exposed for tests.
export function _resetClerkUserCache(): void {
  cache.clear();
}

export function _clerkUserCacheSize(): number {
  return cache.size;
}
