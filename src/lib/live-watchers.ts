"use client";

import { useSyncExternalStore } from "react";

/** How many people are currently watching the local user broadcast.
 *  Written by the practice broadcaster (it learns the count from each
 *  `live.progress` response, free — no extra request) and read by the
 *  on-screen spectator indicator. A module-level store rather than a
 *  context so the two can live anywhere in the practice tree and neither
 *  has to poll on its own. */
let count = 0;
const listeners = new Set<() => void>();

export function setWatcherCount(n: number): void {
  if (n === count) return;
  count = n;
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useWatcherCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => count,
    () => 0,
  );
}
