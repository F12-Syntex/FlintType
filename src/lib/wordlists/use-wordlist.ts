"use client";

import { useEffect, useState } from "react";

import {
  WORDLIST_IDS,
  type WordlistId,
} from "@/data/wordlists/catalog";
import {
  fetchWordlist,
  getCachedWordlist,
  isWordlistId,
} from "./fetch";

/** Default wordlist when the user hasn't picked one. Matches the
 *  filename of MonkeyType's `english.json` so the migration from
 *  the embedded English-200 is seamless. */
export const DEFAULT_WORDLIST: WordlistId = "english";

/** Display label for a wordlist id. Mostly the filename with `_`
 *  replaced by space, but a couple of special-cases for readability
 *  (Title Case, common shortcuts like 1k/5k/10k uppercased "1K"). */
export function wordlistLabel(id: string): string {
  return id
    .split("_")
    .map((part) => {
      // Keep MT's count suffixes loud: 1k → 1K, 25k → 25K, 100k → 100K
      if (/^\d+k$/.test(part)) return part.toUpperCase();
      // Common case-fix for compound names like "code_typescript"
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

/** Hook: returns the words for the named wordlist, fetching on demand.
 *  Returns `null` words while a fresh fetch is in flight so callers
 *  know to fall back to the embedded English; once resolved, returns
 *  the full word array.
 *
 *  Re-uses `getCachedWordlist` for instant first-paint on warm
 *  caches (memory or localStorage). */
export function useWordlist(id: string): {
  words: readonly string[] | null;
  loading: boolean;
  /** Resolved id — `id` if it was a known WordlistId, otherwise the
   *  default. Useful when callers want to surface the *actual* list
   *  in use (e.g. "Wordlist: English" after a stored id was rejected). */
  resolvedId: WordlistId;
} {
  const resolvedId: WordlistId = isWordlistId(id) ? id : DEFAULT_WORDLIST;
  const [words, setWords] = useState<readonly string[] | null>(() => {
    const cached = getCachedWordlist(resolvedId);
    return cached ? cached.words : null;
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return getCachedWordlist(resolvedId) == null;
  });

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedWordlist(resolvedId);
    if (cached) {
      setWords(cached.words);
      setLoading(false);
      return;
    }
    setLoading(true);
    setWords(null);
    fetchWordlist(resolvedId)
      .then((file) => {
        if (cancelled) return;
        setWords(file.words);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn(`wordlist '${resolvedId}' failed`, err);
        setWords(null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedId]);

  return { words, loading, resolvedId };
}

export { WORDLIST_IDS };
export type { WordlistId };
