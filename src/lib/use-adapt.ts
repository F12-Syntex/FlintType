"use client";

import { useCallback } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import type { SubmitTestInput } from "@/types/adapt";

/** Bridge between the practice surface and the adaptive routes.
 *  Both calls swallow auth/network errors so the practice flow
 *  stays responsive — the backend is an enhancement, not a
 *  blocker. The caller falls back to its existing local generation
 *  when fetchWords returns null. */
export function useAdapt() {
  const backend = useBackend();

  const fetchWords = useCallback(
    async (count: number, pool: readonly string[]): Promise<string[] | null> => {
      if (pool.length === 0 || count <= 0) return null;
      try {
        const r = await backend.adapt.words({
          count,
          pool: [...pool],
        });
        // The route signals cold by returning a uniform-random sample
        // — equivalent to local generation, so let the caller fall
        // back rather than swap a random for a random.
        if (r.cold) return null;
        return r.words.length > 0 ? r.words : null;
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
