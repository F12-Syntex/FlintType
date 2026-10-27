"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** `false` during SSR and the hydration render, `true` afterwards —
 *  without a setState-in-effect round trip. Use it to gate output that
 *  depends on client-only state (the resolved theme, localStorage). */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
