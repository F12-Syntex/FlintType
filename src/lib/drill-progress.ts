"use client";

import { useCallback, useMemo } from "react";
import { useRemotePrefs } from "./use-remote-prefs";

/** Per-user persisted progress for drills that fill out across many
 *  sessions. Today only the burst-1000 drill uses this — every word
 *  the user has ever cleared at threshold WPM is logged here, so the
 *  surface can resume mid-grid on a return visit and the bottom
 *  discovery strip reads honestly across sessions.
 *
 *  Stored as a regular slice in the user-prefs blob (`drillProgress`).
 *  Set semantics are simulated with a string array — the JSON blob
 *  format predates Sets and we want the wire shape to stay
 *  human-readable. */
export type DrillProgress = {
  burst1000Discovered: string[];
};

const DEFAULTS: DrillProgress = {
  burst1000Discovered: [],
};

export function useDrillProgress() {
  const { value, update, reset } = useRemotePrefs("drillProgress", DEFAULTS);

  const discoveredSet = useMemo(
    () => new Set(value.burst1000Discovered),
    [value.burst1000Discovered],
  );

  /** Add a word to the discovered set. No-op if already there — the
   *  surface fires this on every clear, including re-clears of words
   *  the user discovered in a prior session. The dedupe is cheaper
   *  than reasoning about it at the call site. */
  const markDiscovered = useCallback(
    (word: string) => {
      const w = word.toLowerCase();
      update((cur) =>
        cur.burst1000Discovered.includes(w)
          ? cur
          : {
              ...cur,
              burst1000Discovered: [...cur.burst1000Discovered, w],
            },
      );
    },
    [update],
  );

  return { value, discoveredSet, markDiscovered, reset } as const;
}
