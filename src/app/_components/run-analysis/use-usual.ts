"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { BackendError, useBackend } from "@/lib/backend";
import type { InsightsUsualOutput } from "@/types/insights";
import type { RunAnalysisSource } from "@/types/typing-analysis";

export type UsualState =
  | { kind: "loading" }
  | { kind: "ready"; data: InsightsUsualOutput }
  | { kind: "error"; retry: () => void }
  | { kind: "signed-out" };

/** Resolved answers, newest last, keyed by user, bucket, run start and fix
 *  mode. A remount (back from the replay, a settings toggle) reads the
 *  answer from here instead of asking again. Errors are never kept. */
const CACHE_MAX = 8;
const cache = new Map<string, InsightsUsualOutput>();

function remember(key: string, data: InsightsUsualOutput): void {
  cache.delete(key);
  cache.set(key, data);
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

type Outcome = { key: string; kind: "error" | "signed-out" };

/** The usual reference for the finished run (spec-50 §3.7): one
 *  `insights.usual` call as soon as the source appears, in parallel with
 *  the submit. The source's `startedAt` keeps this run out of its own
 *  reference. Null (render nothing) when there is no source. */
export function useUsual(source: RunAnalysisSource | null): UsualState | null {
  const backend = useBackend();
  const { user, isSignedIn } = useUser();
  const userId = user?.id ?? null;
  const key = source && userId ? `${userId}|${source.bucket}|${source.startedAt}|${source.fixMode}` : null;
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Bumped when an answer lands, so the cache read below re-renders.
  const [, setLanded] = useState(0);

  useEffect(() => {
    if (!key || !source || cache.has(key)) return;
    let current = true;
    backend.insights
      .usual({ bucket: source.bucket, beforeMs: source.startedAt, fixMode: source.fixMode })
      .then((data) => {
        // Kept even after unmount: the replay view swaps the summary out.
        remember(key, data);
        if (current) setLanded((n) => n + 1);
      })
      .catch((err: unknown) => {
        if (!current) return;
        const unauthorised = err instanceof BackendError && err.code === "UNAUTHORIZED";
        setOutcome({ key, kind: unauthorised ? "signed-out" : "error" });
      });
    return () => {
      // A response for an earlier run (or after unmount) is ignored.
      current = false;
    };
  }, [backend, key, source, attempt]);

  const retry = useCallback(() => {
    setOutcome(null);
    setAttempt((n) => n + 1);
  }, []);

  if (!source) return null;
  if (isSignedIn === false) return { kind: "signed-out" };
  const data = key ? cache.get(key) : undefined;
  if (data) return { kind: "ready", data };
  if (outcome && outcome.key === key) {
    return outcome.kind === "error" ? { kind: "error", retry } : { kind: "signed-out" };
  }
  return { kind: "loading" };
}
