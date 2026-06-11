"use client";

/** The Clerk user id (or "anon") that the browser-local convenience
 *  caches currently belong to. Namespacing those caches by owner stops
 *  one account's data bleeding into the next account signed in on a
 *  shared browser (FT-041) — e.g. the PB-crown cache and the BURST
 *  rolling-average cache, which key off (mode, length) but not the user.
 *
 *  Deliberately a tiny dependency-free module so the cache helpers can
 *  read it without importing the prefs store (or React). The
 *  `<ClientCacheGate>` provider keeps it in sync with the signed-in
 *  user. Defaults to "anon" for SSR and the signed-out path. */
let owner = "anon";

export function setCacheOwner(userId: string | null): void {
  owner = userId ?? "anon";
}

export function getCacheOwner(): string {
  return owner;
}
