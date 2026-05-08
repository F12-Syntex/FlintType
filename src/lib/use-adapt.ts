"use client";

import { useCallback, useRef } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import type { SubmitTestInput } from "@/types/adapt";

/** Target queue depth. Every test, every reset, every dequeue kicks a
 *  background refill that re-fills the queue back up to this many
 *  batches against the latest model snapshot. So the user nearly
 *  always finds a ready batch waiting on the next reset, with no
 *  network round-trip. The route caps the per-call max at 10 (see
 *  `requestWordsInputSchema`); 5 is a comfortable middle. */
const PREFETCH_BATCHES = 5;

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
  /** Per-(count, pool) queue of pre-generated batches. Drained by
   *  fetchWords; restocked by `refill`. */
  const queueRef = useRef<Map<string, string[][]>>(new Map());
  /** Active refill promises keyed by (count, pool). A second refill
   *  call for the same key while one is in flight returns the
   *  existing promise instead of issuing a parallel network request. */
  const inflightRefillsRef = useRef<Map<string, Promise<void>>>(new Map());
  /** Per-call token map. submit clears all entries; a refill that
   *  completes after a submit detects via this map that its token
   *  is no longer the active one and bows out without writing to
   *  the queue. Decoupled from `inflightRefillsRef` so we don't
   *  have to reason about the IIFE referencing its own promise
   *  before assignment. */
  const refillTokensRef = useRef<Map<string, object>>(new Map());

  /** Fire-and-forget background refill. Requests `PREFETCH_BATCHES`
   *  fresh batches and replaces the queue under (count, pool) with
   *  them. Returns the in-flight promise so callers that genuinely
   *  need to wait (the empty-queue path of fetchWords) can do so. */
  const refill = useCallback(
    (count: number, pool: readonly string[]): Promise<void> => {
      if (pool.length === 0 || count <= 0) return Promise.resolve();
      const key = queueKey(count, pool);
      const existing = inflightRefillsRef.current.get(key);
      if (existing) return existing;
      // Token captured before the IIFE so the async body can compare
      // identity in `finally` without referencing its own promise.
      const myToken = {};
      refillTokensRef.current.set(key, myToken);
      const p = (async () => {
        try {
          const r = await backend.adapt.words({
            count,
            pool: [...pool],
            batches: PREFETCH_BATCHES,
          });
          // Stale-write guard: a submit between request and response
          // invalidates this batch (model snapshot changed). The
          // submit handler clears the token map; if our token isn't
          // the current one anymore, drop the result on the floor.
          if (refillTokensRef.current.get(key) !== myToken) return;
          // Cold start signals "uniform random" — equivalent to local
          // generation, so don't queue. The caller already falls back
          // to its own generator when fetchWords returns null. Drop
          // any prior entries so we don't serve cold batches against
          // a now-warm model snapshot.
          if (r.cold) {
            queueRef.current.delete(key);
            return;
          }
          if (r.batches.length === 0) return;
          queueRef.current.set(key, r.batches);
        } catch {
          // Network / 5xx / auth — silent; next fetchWords retries.
        } finally {
          // Only clear our markers — a submit may have already
          // wiped them, and a newer refill may have set its own.
          if (refillTokensRef.current.get(key) === myToken) {
            refillTokensRef.current.delete(key);
            inflightRefillsRef.current.delete(key);
          }
        }
      })();
      inflightRefillsRef.current.set(key, p);
      return p;
    },
    [backend],
  );

  const fetchWords = useCallback(
    async (count: number, pool: readonly string[]): Promise<string[] | null> => {
      if (pool.length === 0 || count <= 0) return null;
      const key = queueKey(count, pool);
      const queue = queueRef.current.get(key);
      // Fast path: a queued batch is ready.
      if (queue && queue.length > 0) {
        const next = queue.shift()!;
        if (queue.length === 0) queueRef.current.delete(key);
        // Top up so the next reset finds another ready batch. The
        // refill replaces the queue with PREFETCH_BATCHES fresh
        // batches against the current model snapshot.
        void refill(count, pool);
        return next.length > 0 ? next : null;
      }
      // Empty queue — wait for a refill, then dequeue from it.
      try {
        await refill(count, pool);
      } catch {
        // refill already swallows errors; this catch is belt-and-braces.
      }
      const after = queueRef.current.get(key);
      if (after && after.length > 0) {
        const next = after.shift()!;
        if (after.length === 0) queueRef.current.delete(key);
        return next.length > 0 ? next : null;
      }
      // Refill came back cold, errored, or returned nothing actionable.
      // Caller falls back to local generation.
      return null;
    },
    [refill],
  );

  const submitTest = useCallback(
    async (input: SubmitTestInput): Promise<void> => {
      // Submitting updates the model. Queued batches were generated
      // against the *previous* snapshot — drop them so the next reset
      // sees only fresh-model batches. Also drop in-flight refill
      // markers so a follow-up `refill` call can issue immediately
      // against the new snapshot rather than waiting on the stale
      // one (which, on completion, will detect via the marker check
      // that a newer refill has taken its place and bow out).
      queueRef.current.clear();
      inflightRefillsRef.current.clear();
      refillTokensRef.current.clear();
      try {
        await backend.adapt.submit(input);
      } catch {
        // Fire-and-forget — the user has already seen their results,
        // and the next submit will fold any timings we missed via
        // the running-mean update.
      }
      // Caller is expected to invoke `refill(count, pool)` after this
      // resolves to replenish against the freshly-updated model. We
      // don't refill here because we don't know the active (count,
      // pool); only the practice context does.
    },
    [backend],
  );

  return { fetchWords, submitTest, refill } as const;
}
