"use client";

import { useCallback, useEffect, useRef } from "react";
import type { useBackend } from "@/lib/backend";
import { useRemotePrefs } from "@/lib/use-remote-prefs";
import type { MonkeytypeStatsSlice } from "@/types/monkeytype";

type Backend = ReturnType<typeof useBackend>;

const EMPTY_MT_SLICE: MonkeytypeStatsSlice = {
  importedAt: 0,
  pbs: { time: {}, words: {} },
};

/** The viewer's own MonkeyType import slice, plus a once-per-page-load
 *  re-sync when they own this profile and stored an Ape Key.
 *
 *  `isMtConnected` is true once the owner has imported by either path
 *  (a stored Ape Key for repeat syncs, or a one-shot data import that
 *  writes `importedAt > 0` with no key), which is what hides the
 *  import banner. Auto-sync still needs the stored key. Visitors never
 *  trigger a sync. */
export function useMonkeytypeSync(backend: Backend, isOwner: boolean | null) {
  const { value: slice, update } = useRemotePrefs<MonkeytypeStatsSlice>(
    "monkeytypeStats",
    EMPTY_MT_SLICE,
  );
  const own = slice.importedAt > 0 ? slice : null;
  const hasStoredKey = isOwner === true && own?.encryptedApiKey != null;

  const syncedRef = useRef(false);
  useEffect(() => {
    if (!hasStoredKey || syncedRef.current) return;
    syncedRef.current = true;
    let cancelled = false;
    backend.monkeytype
      .import({})
      .then((out) => {
        if (!cancelled) update(out.slice);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [hasStoredKey, backend, update]);

  const clear = useCallback(() => update(EMPTY_MT_SLICE), [update]);

  return { slice, update, clear, isMtConnected: own != null };
}
