"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBackend } from "@/lib/backend";
import type { InsightsOverviewOutput } from "@/types/insights";
import { BUCKET_PARAM, bucketQuery, parseBucketParam } from "./bucket-param";
import { toLoadError, type LoadError } from "./load-error";

/** The /insights data (spec-40 §2): one `insights.overview` call per
 *  bucket, in the throw style, cached in memory for the page's lifetime.
 *  The bucket lives in the URL (`?tests=`, default left out), written
 *  with `history.replaceState` so a switch never reloads the page. On a
 *  switch the previous overview stays on screen (`switching`) until the
 *  new one lands, so there is no skeleton flash.
 *
 *  A switch that fails puts the URL back to the bucket on show, so the
 *  picker, the URL and the sections always agree; Try again asks for the
 *  failed bucket again. Only a user action (a pick, Try again, a
 *  refresh) clears an error, so putting the URL back keeps it. */
export function useInsights() {
  const backend = useBackend();
  const pathname = usePathname();
  const params = useSearchParams();
  const qs = params.toString();
  const requested = parseBucketParam(params.get(BUCKET_PARAM));

  const cache = useRef(new Map<string, InsightsOverviewOutput>());
  const shown = useRef<InsightsOverviewOutput | null>(null);
  const defaultRef = useRef<string | null>(null);
  const [defaultKey, setDefaultKey] = useState<string | null>(null);
  const [data, setData] = useState<InsightsOverviewOutput | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  /** The bucket a switch failed to load ("" for the default). */
  const [failed, setFailed] = useState<string | null>(null);
  /** The bucket being fetched ("" for the default). */
  const [pending, setPending] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  /** Writes `key` (null for the default) into the URL. */
  const writeUrl = useCallback(
    (key: string | null, search: string) => {
      const query = bucketQuery(search, key, defaultRef.current);
      // The native History API syncs with useSearchParams without a server
      // round trip (Next's linking guide), so a switch only waits for its
      // own overview request.
      window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [pathname],
  );

  useEffect(() => {
    const key = requested ?? "";
    let cancelled = false;
    const hit = cache.current.get(key);
    // A microtask, so the cached and the fetched paths both set state
    // outside the effect body.
    const run = hit
      ? Promise.resolve(hit)
      : backend.insights.overview(requested ? { bucket: requested } : {});
    queueMicrotask(() => {
      if (!cancelled && !hit) setPending(key);
    });
    run
      .then((r) => {
        if (cancelled) return;
        cache.current.set(key, r);
        if (r.bucket) cache.current.set(r.bucket.key, r);
        if (!requested) {
          defaultRef.current = r.bucket?.key ?? null;
          setDefaultKey(defaultRef.current);
        }
        shown.current = r;
        setData(r);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(toLoadError(err));
        const onShow = shown.current?.bucket?.key;
        if (onShow) {
          setFailed(key);
          writeUrl(onShow, window.location.search.slice(1));
        }
      })
      .finally(() => {
        if (!cancelled) setPending(null);
      });
    return () => {
      cancelled = true;
    };
  }, [backend, requested, attempt, writeUrl]);

  const select = useCallback(
    (key: string | null) => {
      setError(null);
      setFailed(null);
      writeUrl(key, qs);
    },
    [qs, writeUrl],
  );

  /** Asks again for what failed: the failed bucket after a switch (the
   *  URL went back), or the same request (a first load or a refresh). */
  const retry = useCallback(() => {
    setError(null);
    setFailed(null);
    if (failed !== null && failed !== (requested ?? "")) writeUrl(failed === "" ? null : failed, qs);
    else setAttempt((n) => n + 1);
  }, [failed, requested, qs, writeUrl]);

  /** Drops every cached bucket and reloads the one on show (after the
   *  analysis is deleted). */
  const refresh = useCallback(() => {
    cache.current.clear();
    setError(null);
    setFailed(null);
    setAttempt((n) => n + 1);
  }, []);

  const switching = pending !== null && data !== null;
  return {
    data,
    error,
    /** The first load: nothing to show yet. */
    loading: data === null && error === null,
    /** A bucket switch or refresh is in flight over the previous content. */
    switching,
    /** The bucket the picker shows: the one being loaded while a switch
     *  is in flight (so it follows the pick at once), else the one on
     *  show. */
    pickerKey: (switching ? (pending === "" ? defaultKey : pending) : null) ?? data?.bucket?.key ?? null,
    /** The bucket a switch failed to load, for naming it (null: none,
     *  or the default before it ever loaded). */
    failedKey: failed === "" ? defaultKey : failed,
    select,
    retry,
    refresh,
  };
}
