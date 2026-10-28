"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  filtersToQuery,
  type LeaderboardFilters,
  parseFilters,
  withAuth,
} from "./filters";

/** The board's filters, read from and written to the URL. Writes use
 *  `router.replace` so filter changes don't pile up in history.
 *
 *  `filters` is the effective slice: a friends link opened signed out
 *  reads as the global board, so the toolbar, sheet, empty state and
 *  fetch all agree on what is shown. `authLoaded` lets a friends board
 *  wait for Clerk instead of painting the global board first. */
export function useLeaderboardParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { isLoaded, isSignedIn } = useUser();
  const qs = params.toString();
  const signedIn = !!isSignedIn;

  const filters = useMemo(() => {
    const sp = new URLSearchParams(qs);
    return withAuth(parseFilters((k) => sp.get(k)), {
      isLoaded,
      isSignedIn: signedIn,
    });
  }, [qs, isLoaded, signedIn]);

  const setFilters = useCallback(
    (next: Partial<LeaderboardFilters>) => {
      const query = filtersToQuery(
        { ...filters, ...next },
        new URLSearchParams(qs),
      );
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [filters, qs, pathname, router],
  );

  return { filters, setFilters, authLoaded: isLoaded, signedIn };
}

export type SetLeaderboardFilters = ReturnType<
  typeof useLeaderboardParams
>["setFilters"];
