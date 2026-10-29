"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearSlice,
  getCache,
  loadPrefs,
  readSlice,
  subscribe,
  writeSlice,
} from "./prefs-store";

/** Generic hook factory: bind a slice of the remote prefs blob to a
 *  React component. Returns the current value (defaults until the
 *  blob has loaded), a `loaded` flag that flips true once the prefs
 *  blob is available (localStorage seed or backend GET — see
 *  prefs-store loadPrefs) or once this slice is written locally, an
 *  `update(patch)` to merge in changes,
 *  and a `reset()` that drops the slice (so the next read returns
 *  `defaults`). All writes are debounced to a single backend POST.
 *
 *  `loaded` starts false on the server AND on the first client render
 *  (it only flips inside an effect), so gating UI on it is hydration-
 *  safe: surfaces that must not flash defaults (e.g. a dismissable
 *  banner) render null until `loaded` is true. */
export function useRemotePrefs<T extends object>(
  key: string,
  defaults: T,
): {
  value: T;
  loaded: boolean;
  update: (patch: Partial<T> | ((prev: T) => T)) => void;
  reset: () => void;
} {
  const [value, setValue] = useState<T>(() => readSlice(key, defaults));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    // Pull the blob if it isn't loaded yet. loadPrefs seeds the cache
    // from localStorage synchronously; when it did, the blob is already
    // available, so `loaded` doesn't wait on the backend GET (whose
    // result arrives through the subscription below). Appliers gate on
    // `loaded`, so it must not hang on a slow GET.
    const pending = loadPrefs();
    void (getCache() ? Promise.resolve() : pending).then(() => {
      if (mounted) {
        setValue(readSlice(key, defaults));
        setLoaded(true);
      }
    });
    // Subscribe to every change so peer hooks (e.g. the customise page
    // and the test surface in the same tab) stay in sync.
    const unsub = subscribe(() => {
      if (!mounted) return;
      setValue(readSlice(key, defaults));
      // With nothing stored (first visit, cleared or blocked storage)
      // the cache only appears once the GET settles, or when the user
      // writes a pref while it is still pending. A write to this slice
      // is a real value, so the appliers gated on `loaded` must paint it
      // now instead of waiting on (or hanging with) the GET. Only this
      // slice counts: a write elsewhere says nothing about this one, and
      // flipping on it could flash flash-guarded UI (the Discord banner)
      // before its stored dismissal arrives.
      const cache = getCache();
      if (cache && key in cache) setLoaded(true);
    });
    return () => {
      mounted = false;
      unsub();
    };
    // The defaults object is captured once at mount — callers should
    // pass a stable reference (module-level const).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (patch: Partial<T> | ((prev: T) => T)) => {
      const cur = readSlice(key, defaults);
      let next: T;
      let changedFields: string[];
      if (typeof patch === "function") {
        next = (patch as (p: T) => T)(cur);
        // Functional patch: we don't know what the caller touched, so
        // diff next vs cur and treat the changed fields as dirty.
        const nextRec = next as Record<string, unknown>;
        const curRec = cur as Record<string, unknown>;
        changedFields = Object.keys(nextRec).filter(
          (k) => nextRec[k] !== curRec[k],
        );
      } else {
        next = { ...cur, ...patch };
        // Object patch: exactly the patched keys are the user's edits.
        changedFields = Object.keys(patch);
      }
      writeSlice(key, next, changedFields);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const reset = useCallback(() => {
    clearSlice(key);
  }, [key]);

  return { value, loaded, update, reset };
}
