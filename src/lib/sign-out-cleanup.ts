/** Per-user localStorage cleanup that runs on sign-out, so the next
 *  user on this browser doesn't inherit the previous user's cached
 *  state (issue #35: PB crown baseline + BURST avg-WPM seed).
 *
 *  Design: a small registry of exact keys + key prefixes. New per-user
 *  caches add themselves here (issue #52's prefs-store bleed can hook
 *  in later by extending these lists) — every sign-out call site routes
 *  through `clearUserScopedStorage()`, never hand-rolls removals. */

/** Exact localStorage keys removed on sign-out. */
export const USER_SCOPED_KEYS: readonly string[] = ["ft:avg-wpm-samples"];

/** Key prefixes — every key starting with one of these is removed. */
export const USER_SCOPED_KEY_PREFIXES: readonly string[] = ["ft:pb:"];

/** Pure core: given the full key list of a storage, return the keys
 *  that are user-scoped and should be cleared. Exported for tests. */
export function selectUserScopedKeys(allKeys: readonly string[]): string[] {
  return allKeys.filter(
    (k) =>
      USER_SCOPED_KEYS.includes(k) ||
      USER_SCOPED_KEY_PREFIXES.some((p) => k.startsWith(p)),
  );
}

/** Remove every user-scoped cache key from localStorage. Safe to call
 *  in any environment (no-ops on the server / when storage throws). */
export function clearUserScopedStorage(): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined")
    return;
  try {
    const all: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k !== null) all.push(k);
    }
    for (const k of selectUserScopedKeys(all)) localStorage.removeItem(k);
  } catch {
    // Storage unavailable (private mode / quota) — nothing to clear.
  }
}
