"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearSlice,
  getCache,
  loadPrefs,
  patchSlice,
  readSlice,
  subscribe,
  writeSlice,
} from "./prefs-store";

/** Generic hook factory: bind a slice of the remote prefs blob to a
 *  React component. Returns the current value (defaults until the
 *  blob has loaded), an `update(patch)` to merge in changes, a
 *  `reset()` that drops the slice (so the next read returns
 *  `defaults`), and a `loaded` flag that is false until the blob has
 *  resolved (so callers can avoid flashing default-derived UI in then
 *  out once the real value arrives). All writes are debounced to a
 *  single backend POST. */
export function useRemotePrefs<T extends object>(
  key: string,
  defaults: T,
): {
  value: T;
  update: (patch: Partial<T> | ((prev: T) => T)) => void;
  reset: () => void;
  loaded: boolean;
} {
  const [value, setValue] = useState<T>(() => readSlice(key, defaults));
  const [loaded, setLoaded] = useState<boolean>(() => getCache() !== null);

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
      if (mounted) {
        setValue(readSlice(key, defaults));
        setLoaded(getCache() !== null);
      }
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
      if (typeof patch === "function") {
        // Functional update needs the current full value; readSlice
        // layers defaults so the function sees a complete object.
        const cur = readSlice(key, defaults);
        writeSlice(key, (patch as (p: T) => T)(cur));
      } else {
        // Field-level patch — merge only the changed fields so a write
        // before the first load can't fabricate a full defaults-derived
        // slice that later clobbers the server slice (FT-013).
        patchSlice(key, patch as Record<string, unknown>);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const reset = useCallback(() => {
    clearSlice(key);
  }, [key]);

  return { value, update, reset, loaded };
}
