import type { UserPrefsBlob } from "@/types/user-prefs";

/** prefs.set stores an opaque, client-supplied blob. Two slices inside it
 *  feed *public competitive ranking and profile display* (the Top-by-Level
 *  board and the profile hero level/XP), so they cannot be trusted raw
 *  from the client:
 *
 *   - `monkeytypeStats` — has a server-authoritative writer (the Ape-Key
 *     `monkeytype.import` route, which fetches the real numbers and writes
 *     the repo directly). prefs.set is an open parallel path that could
 *     overwrite it with forged completedTests / PBs. We close that by
 *     PRESERVING the stored slice: the client may never create, change,
 *     or delete `monkeytypeStats` through prefs.set.
 *
 *   - `lifetimeStats` — incremented client-side (drills, races), so it has
 *     no server source we can swap in. We can't make it fully trustworthy
 *     without server-authoritative counters (the proper follow-up), but we
 *     clamp it so a single forged POST can't inflate it: each counter is
 *     forced MONOTONIC (never below the stored value) and bounded to a
 *     small per-write delta. Combined with the prefs rate limit, growth is
 *     capped at roughly drill-by-drill pace, so large-scale forgery is
 *     impractical instead of one API call.
 *
 *  Everything else in the blob stays opaque and client-owned. Pure (no
 *  db / React) so it's unit-testable and safe to import into the route. */

/** Max a lifetime counter may rise in one prefs.set write. A legitimate
 *  drill/race completion bumps a counter by 1, so 50 is generous headroom
 *  for any plausible burst while making it take ~20M rate-limited writes
 *  to forge a billion. */
export const MAX_LIFETIME_DELTA_PER_WRITE = 50;

const LIFETIME_KEYS = [
  "drillsCompleted",
  "racesFinished",
  "racesWon",
] as const;

function floorNonNegative(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}

/** Clamp an incoming counter against the stored value: monotonic (never
 *  decreases) and at most `MAX_LIFETIME_DELTA_PER_WRITE` above stored.
 *  An omitted incoming value preserves the stored count. */
function clampCounter(storedVal: unknown, incomingVal: unknown): number {
  const stored = floorNonNegative(storedVal);
  if (incomingVal === undefined) return stored;
  const incoming = floorNonNegative(incomingVal);
  return Math.min(
    Math.max(incoming, stored),
    stored + MAX_LIFETIME_DELTA_PER_WRITE,
  );
}

/** Return the blob to actually persist for a client prefs.set, given the
 *  currently-stored blob and the client's submitted blob. */
export function sanitizePrefsWrite(
  stored: UserPrefsBlob | undefined | null,
  incoming: UserPrefsBlob,
): UserPrefsBlob {
  const prev = (stored ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = { ...incoming };

  // monkeytypeStats: server-owned — preserve the stored value (or its
  // absence). The verified import route writes the repo directly, so it
  // is unaffected by this route-level guard.
  if (prev.monkeytypeStats !== undefined) {
    out.monkeytypeStats = prev.monkeytypeStats;
  } else {
    delete out.monkeytypeStats;
  }

  // lifetimeStats: clamp each counter monotonically + per-write delta.
  const storedLt = (prev.lifetimeStats ?? undefined) as
    | Record<string, unknown>
    | undefined;
  const incomingLt = incoming.lifetimeStats as
    | Record<string, unknown>
    | undefined;
  if (storedLt === undefined && incomingLt === undefined) {
    delete out.lifetimeStats;
  } else {
    out.lifetimeStats = Object.fromEntries(
      LIFETIME_KEYS.map((k) => [
        k,
        clampCounter(storedLt?.[k], incomingLt?.[k]),
      ]),
    );
  }

  return out as UserPrefsBlob;
}
