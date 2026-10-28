"use client";

import { useEffect, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";

type Backend = ReturnType<typeof useBackend>;
type RankedOutput<T> = { players: readonly T[]; generatedAtMs: number };

/** Module-level cache so flipping between views repaints instantly while
 *  a background refresh runs (same idea as `useLeaderboard`). */
const cache = new Map<string, RankedOutput<unknown>>();

export type RankedState<T> = {
  data: readonly T[] | null;
  generatedAt: number | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
};

type Settled<T> = {
  /** Which request (key + refresh count) this result answers. */
  token: string;
  out: RankedOutput<T> | null;
  error: string | null;
};

/** Fetch a user-centric ranking (top players, top by level). `load`
 *  must be a stable, module-level function. A request is pending until
 *  a result for the current key + refresh count has settled. */
export function useRanked<T>(
  key: string,
  load: (backend: Backend) => Promise<RankedOutput<T>>,
): RankedState<T> {
  const backend = useBackend();
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);
  const token = `${key}#${tick}`;

  useEffect(() => {
    let cancelled = false;
    load(backend)
      .then((out) => {
        if (cancelled) return;
        cache.set(key, out);
        setSettled({ token, out, error: null });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSettled({
          token,
          out: null,
          error:
            err instanceof BackendError
              ? err.message
              : "Couldn't load the leaderboard. Try again in a moment.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [backend, key, load, token]);

  const pending = settled?.token !== token;
  const out =
    (settled?.out && settled.token.startsWith(`${key}#`) ? settled.out : null) ??
    (cache.get(key) as RankedOutput<T> | undefined) ??
    null;

  return {
    data: out?.players ?? null,
    generatedAt: out?.generatedAtMs ?? null,
    error: pending ? null : (settled?.error ?? null),
    loading: pending && out == null,
    refreshing: pending && out != null,
    refresh: () => setTick((n) => n + 1),
  };
}
