"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback } from "react";
import { useBackend } from "./backend";
import {
  DEFAULT_LIFETIME_STATS,
  type LifetimeStats,
} from "./lifetime-stats";
import { useRemotePrefs } from "./use-remote-prefs";

/** React-side binding to the `lifetimeStats` slice — the pure
 *  reader + types live in `./lifetime-stats.ts` (importable
 *  server-side without dragging the prefs-store / Clerk chain into
 *  the server bundle). Components consume this hook; the leaderboard
 *  + history routes use `readLifetimeStats` directly.
 *
 *  `lifetimeStats` is server-authoritative (FT-029): the public level /
 *  ranking is derived from it, so a signed-in user's drill count is bumped
 *  through the trusted `prefs.drillComplete` route and the server ignores
 *  any value the client tries to set in the prefs blob. The local write is
 *  kept purely as an optimistic update (and as the whole story for guests,
 *  who aren't ranked). */
export function useLifetimeStats(): {
  value: LifetimeStats;
  incrementDrillsCompleted: () => void;
} {
  const { value, update } = useRemotePrefs(
    "lifetimeStats",
    DEFAULT_LIFETIME_STATS,
  );
  const backend = useBackend();
  const { isSignedIn } = useUser();

  const incrementDrillsCompleted = useCallback(() => {
    // Optimistic local bump for immediate UI; the server value (returned
    // by prefs.get on the next load) is authoritative and overwrites it.
    update((cur) => ({ ...cur, drillsCompleted: cur.drillsCompleted + 1 }));
    if (isSignedIn) {
      void backend.prefs.drillComplete().catch(() => {
        // A failed count bump is a soft loss — never block the drill flow.
      });
    }
  }, [update, backend, isSignedIn]);

  return { value, incrementDrillsCompleted };
}
