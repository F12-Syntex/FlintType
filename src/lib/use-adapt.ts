"use client";

import { useCallback, useRef } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import type { SubmitTestInput } from "@/types/adapt";

/** How many extra batches the route should generate per warm fetch.
 *  3 means: the user hits restart, gets the active batch, and the
 *  next two restarts are answered from the in-memory queue without
 *  a round-trip. The whole queue is invalidated by `submitTest`
 *  because the model snapshot the batches were generated against
 *  has just been updated. */
const PREFETCH_BATCHES = 3;

/** Hash a (count, pool) request into a queue key. The pool is
 *  filtered upstream by behaviour prefs (difficulty, min length,
 *  show-secondary) — its identity is what matters for batch
 *  reusability. Cheap because the pool is at most ~200 strings. */
function queueKey(count: number, pool: readonly string[]): string {
  // Length + first/last word + middle word is enough entropy to
  // distinguish the difficulty-filtered pools we ever generate, and
  // far cheaper than hashing every word.
  const mid = pool[Math.floor(pool.length / 2)] ?? "";
  return `${count}|${pool.length}|${pool[0] ?? ""}|${mid}|${pool[pool.length - 1] ?? ""}`;
}

/** Bridge between the practice surface and the adaptive routes.
 *  Both calls swallow auth/network errors so the practice flow
 *  stays responsive — the backend is an enhancement, not a
 *  blocker. The caller falls back to its existing local generation
 *  when fetchWords returns null. */
export function useAdapt() {
  const backend = useBackend();
  /** Per-(count, pool) queue of pre-generated batches. A successful
   *  fetch returns the head and stashes the rest here; the next call
   *  with the same key drains the queue without a round-trip. */
  const queueRef = useRef<Map<string, string[][]>>(new Map());

  const fetchWords = useCallback(
    async (count: number, pool: readonly string[]): Promise<string[] | null> => {
      if (pool.length === 0 || count <= 0) return null;
      const key = queueKey(count, pool);
      const queue = queueRef.current.get(key);
      // Fast path: a prior call left a batch ready for this exact
      // (count, pool). No network, no glitch on reset.
      if (queue && queue.length > 0) {
        const next = queue.shift()!;
        if (queue.length === 0) queueRef.current.delete(key);
        return next.length > 0 ? next : null;
      }

      try {
        const r = await backend.adapt.words({
          count,
          pool: [...pool],
          batches: PREFETCH_BATCHES,
        });
        // The route signals cold by returning a uniform-random sample
        // — equivalent to local generation, so let the caller fall
        // back rather than swap a random for a random. Don't queue
        // cold batches; they'd waste memory on something the caller
        // is going to discard anyway.
        if (r.cold) return null;
        if (r.batches.length === 0) return null;
        const [head, ...rest] = r.batches;
        if (rest.length > 0) {
          // Replace any prior queue under this key — the fresh fetch
          // is more recent against the model snapshot than whatever
          // we had stashed.
          queueRef.current.set(key, rest);
        }
        return head && head.length > 0 ? head : null;
      } catch (err) {
        if (err instanceof BackendError && err.code === "UNAUTHORIZED") {
          return null;
        }
        // Network / 5xx / unexpected — never block the practice flow.
        return null;
      }
    },
    [backend],
  );

  const submitTest = useCallback(
    async (input: SubmitTestInput): Promise<void> => {
      // Submitting a test updates the model. Any queued batches were
      // generated against the *previous* snapshot — keeping them
      // would mean the next reset paints stale words even though
      // we just learned something new. Cheap to drop; the next
      // fetchWords prefetches a fresh queue.
      queueRef.current.clear();
      try {
        await backend.adapt.submit(input);
      } catch {
        // Fire-and-forget — the user has already seen their results,
        // and the next submit will fold any timings we missed via
        // the running-mean update.
      }
    },
    [backend],
  );

  return { fetchWords, submitTest } as const;
}
