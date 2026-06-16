"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearSlice,
  loadPrefs,
  readSlice,
  subscribe,
  writeSlice,
} from "./prefs-store";

/** Generic hook factory: bind a slice of the remote prefs blob to a
 *  React component. Returns the current value (defaults until the
 *  blob has loaded), a `loaded` flag that flips true once the prefs
 *  blob is available (localStorage seed or backend GET — see
 *  prefs-store loadPrefs), an `update(patch)` to merge in changes,
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
    // Pull the blob if it isn't loaded yet.
    void loadPrefs().then(() => {
      if (mounted) {
        setValue(readSlice(key, defaults));
        setLoaded(true);
      }
    });
    // Subscribe to every change so peer hooks (e.g. the customise page
    // and the test surface in the same tab) stay in sync.
    const unsub = subscribe(() => {
      if (mounted) setValue(readSlice(key, defaults));
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
      const next =
        typeof patch === "function"
          ? (patch as (p: T) => T)(cur)
          : { ...cur, ...patch };
      writeSlice(key, next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const reset = useCallback(() => {
    clearSlice(key);
  }, [key]);

  return { value, loaded, update, reset };
}
