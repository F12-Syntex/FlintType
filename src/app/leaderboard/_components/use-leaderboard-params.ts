"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  filtersToQuery,
  type LeaderboardFilters,
  parseFilters,
} from "./filters";

/** The board's filters, read from and written to the URL. Writes use
 *  `router.replace` so filter changes don't pile up in history. */
export function useLeaderboardParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const qs = params.toString();

  const filters = useMemo(() => {
    const sp = new URLSearchParams(qs);
    return parseFilters((k) => sp.get(k));
  }, [qs]);

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

  return { filters, setFilters };
}

export type SetLeaderboardFilters = ReturnType<
  typeof useLeaderboardParams
>["setFilters"];
