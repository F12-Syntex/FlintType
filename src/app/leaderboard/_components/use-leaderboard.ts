"use client";

import { useEffect, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import type {
  LeaderboardOutput,
  LeaderboardPreset,
  LeaderboardScope,
  LeaderboardWindow,
} from "@/types/leaderboard";
import type { LeaderboardAudience } from "./filters";

type Key = string;
type CacheEntry = {
  data: LeaderboardOutput;
  fetchedAtMs: number;
};

/** Module-level cache keyed on (scope|window|preset). One shared
 *  Map for the entire client process — switching between filters
 *  surfaces previously-loaded slices instantly. */
const cache = new Map<Key, CacheEntry>();

/** Single in-flight promise per key so two mounts asking for the
 *  same slice share one network call instead of doubling up. */
const inflight = new Map<Key, Promise<LeaderboardOutput>>();

/** How fresh a cache entry must be to count as "good enough — don't
 *  refetch on mount". After this window, a mount triggers a
 *  background refresh; older cache is still painted immediately so
 *  the user never sees a skeleton flash on every navigation. */
const FRESH_WINDOW_MS = 60_000;

function keyFor(
  audience: LeaderboardAudience,
  scope: LeaderboardScope,
  window_: LeaderboardWindow,
  preset: LeaderboardPreset,
): Key {
  return `${audience}|${scope}|${window_}|${preset}`;
}

type SliceInput = {
  scope: LeaderboardScope;
  window: LeaderboardWindow;
  preset: LeaderboardPreset;
};
type BackendShape = {
  leaderboard: { list: (input: SliceInput) => Promise<LeaderboardOutput> };
  friends: { leaderboard: (input: SliceInput) => Promise<LeaderboardOutput> };
};

async function fetchSlice(
  backend: BackendShape,
  audience: LeaderboardAudience,
  scope: LeaderboardScope,
  window_: LeaderboardWindow,
  preset: LeaderboardPreset,
): Promise<LeaderboardOutput> {
  const key = keyFor(audience, scope, window_, preset);
  const existing = inflight.get(key);
  if (existing) return existing;
  const input: SliceInput = { scope, window: window_, preset };
  // Friends board hits the auth-gated friends namespace; global hits
  // the public leaderboard route. Same output shape either way.
  const call =
    audience === "friends"
      ? backend.friends.leaderboard(input)
      : backend.leaderboard.list(input);
  const p = call
    .then((res) => {
      cache.set(key, { data: res, fetchedAtMs: Date.now() });
      return res;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

export type LeaderboardState = {
  data: LeaderboardOutput | null;
  error: string | null;
  loading: boolean;
  /** True when we're painting cached data while a background
   *  refresh is mid-flight. Lets the view show a subtle indicator
   *  rather than a full skeleton. */
  refreshing: boolean;
  refresh: () => void;
};

/** SWR-style hook for the leaderboard slice.
 *
 *  Behaviour:
 *    - Mount with a fresh (≤ 60s) cache entry → paint instantly, no
 *      network. `loading` stays false.
 *    - Mount with a stale cache entry → paint instantly, kick off a
 *      background fetch. `refreshing` is true until it resolves.
 *    - Mount with no cache → spinner state (`loading=true`).
 *    - `refresh()` always re-fetches regardless of cache age.
 *    - Filter change → switches to the new slice's cache entry; same
 *      rules apply.
 *
 *  This replaces the previous on-every-mount fetch which made the
 *  page feel sluggish each time the user navigated between filters
 *  or returned from another tab. */
export function useLeaderboard(
  scope: LeaderboardScope,
  window_: LeaderboardWindow,
  preset: LeaderboardPreset,
  audience: LeaderboardAudience = "global",
): LeaderboardState {
  const backend = useBackend() as unknown as BackendShape;
  const key = keyFor(audience, scope, window_, preset);
  const cached = cache.get(key) ?? null;

  const [data, setData] = useState<LeaderboardOutput | null>(
    cached?.data ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(cached == null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const entry = cache.get(key) ?? null;
    const fresh =
      entry != null && Date.now() - entry.fetchedAtMs < FRESH_WINDOW_MS;
    const force = refreshTick > 0;

    // Paint whatever the cache has for the current key first so the
    // table renders instantly when the user swaps filters.
    setData(entry?.data ?? null);

    if (entry && !force) {
      setLoading(false);
      setError(null);
      if (fresh) {
        setRefreshing(false);
        return;
      }
      // Stale → background refresh, keep the rendered table in place.
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
      setError(null);
    }

    fetchSlice(backend, audience, scope, window_, preset)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof BackendError
            ? err.message
            : "Couldn't load the leaderboard. Try again in a moment.",
        );
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setRefreshing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [backend, key, refreshTick, audience, scope, window_, preset]);

  function refresh() {
    setRefreshTick((n) => n + 1);
  }

  return { data, error, loading, refreshing, refresh };
}
