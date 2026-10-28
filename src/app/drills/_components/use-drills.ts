"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import type { HistoryWeakness } from "@/types/history";
import { buildDrills, type DrillSpec } from "./drills-data";

export type LoadError = { message: string; signIn: boolean };

type Snapshot = {
  weakestPairs: readonly HistoryWeakness[];
  weakestTrigrams: readonly { key: string }[];
  weakestWords: readonly { key: string; meanMs: number }[];
  cold: boolean;
  /** Shuffle seed for the generated passages, taken when the data lands
   *  (not during render) so each visit gets a fresh selection. */
  seed: number;
};

/** The drill catalogue for the signed-in user. One
 *  `history.summary()` call feeds `buildDrills`; the index and the
 *  runner both read it, so a drill id resolves to the same spec in
 *  both places. `drills` is null until the first load lands. */
export function useDrills(): {
  drills: DrillSpec[] | null;
  error: LoadError | null;
  loading: boolean;
  retry: () => void;
} {
  const backend = useBackend();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  // A fresh tab can fire this before Clerk has refreshed its session
  // cookie, so the first UNAUTHORIZED is retried once, quietly, before
  // the page tells a signed-in user to sign in.
  const retriedUnauthorized = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    backend.history
      .summary()
      .then((r) => {
        if (cancelled) return;
        setSnap({
          weakestPairs: r.weakestPairs ?? [],
          weakestTrigrams: r.weakestTrigrams ?? [],
          weakestWords: r.weakestWords ?? [],
          cold: r.cold ?? false,
          seed: Date.now(),
        });
      })
      .catch((err) => {
        if (cancelled) return;
        const unauthorized =
          err instanceof BackendError && err.code === "UNAUTHORIZED";
        if (unauthorized && !retriedUnauthorized.current) {
          retriedUnauthorized.current = true;
          retryTimer = setTimeout(() => setAttempt((n) => n + 1), 800);
          return;
        }
        setError(toLoadError(err));
      })
      .finally(() => {
        if (!cancelled && !retryTimer) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [backend, attempt]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const drills = useMemo(() => (snap ? buildDrills(snap) : null), [snap]);
  return { drills, error, loading, retry };
}

function toLoadError(err: unknown): LoadError {
  if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
    return { message: "Sign in to load your drills.", signIn: true };
  }
  if (err instanceof BackendError && err.code === "RATE_LIMITED") {
    return {
      message: "Too many requests in a row. Wait a moment, then try again.",
      signIn: false,
    };
  }
  return {
    message:
      err instanceof Error && err.message
        ? err.message
        : "Something went wrong on our side. Try again in a moment.",
    signIn: false,
  };
}
