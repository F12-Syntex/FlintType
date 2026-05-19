"use client";

import { useCallback } from "react";
import {
  DEFAULT_LIFETIME_STATS,
  type LifetimeStats,
} from "./lifetime-stats";
import { useRemotePrefs } from "./use-remote-prefs";

/** React-side binding to the `lifetimeStats` slice — the pure
 *  reader + types live in `./lifetime-stats.ts` (importable
 *  server-side without dragging the prefs-store / Clerk chain into
 *  the server bundle). Components consume this hook; the leaderboard
 *  + history routes use `readLifetimeStats` directly. */
export function useLifetimeStats(): {
  value: LifetimeStats;
  incrementDrillsCompleted: () => void;
} {
  const { value, update } = useRemotePrefs(
    "lifetimeStats",
    DEFAULT_LIFETIME_STATS,
  );

  const incrementDrillsCompleted = useCallback(() => {
    update((cur) => ({ ...cur, drillsCompleted: cur.drillsCompleted + 1 }));
  }, [update]);

  return { value, incrementDrillsCompleted };
}
