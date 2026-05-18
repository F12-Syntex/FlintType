"use client";

import { WORDLIST_IDS, type WordlistId } from "@/data/wordlists/catalog";

/** Runtime fetcher for MonkeyType wordlists. Pulls from jsdelivr's
 *  CDN-cached copy of the MT repo so we never touch GitHub's API
 *  rate limit and the user sees the file on their nearest edge.
 *
 *  Caches:
 *    - In-memory `Map` for the JS session (instant repeat picks).
 *    - localStorage for cross-session reuse (the lists are small —
 *      english@1k is ~6 KB; even english_450k is ~3 MB, well within
 *      a single LS entry).
 *
 *  No backend involvement — wordlists are public, immutable, and
 *  routed via a third-party CDN so a flinttype outage doesn't
 *  prevent users from changing wordlists.
 *
 *  License: MonkeyType ships under GPL-3.0; we link out to the live
 *  files at runtime rather than redistributing them in our bundle. */

const CDN_BASE =
  "https://cdn.jsdelivr.net/gh/monkeytypegame/monkeytype@master/frontend/static/languages";
const LS_PREFIX = "flinttype:wordlist:v1:";

type WordlistFile = {
  name: string;
  words: string[];
  /** MT's flag for words ordered most-common-first. We honour this
   *  so power-users picking `english_25k` know whether the head of
   *  the list is the high-frequency slice or not. */
  orderedByFrequency?: boolean;
  /** MT's flag for right-to-left scripts. Surfaced to the practice
   *  surface so it can flip direction when one of those lists is
   *  picked. */
  leftToRight?: boolean;
  noLazyMode?: boolean;
};

const memCache = new Map<WordlistId, WordlistFile>();
const inFlight = new Map<WordlistId, Promise<WordlistFile>>();

/** Whether an id matches the registered MT wordlist set. Exported so
 *  the prefs slice can validate stored values on load — a stale id
 *  from a removed MT wordlist falls back to the default. */
export function isWordlistId(id: string): id is WordlistId {
  return (WORDLIST_IDS as readonly string[]).includes(id);
}

/** Fetch a wordlist. Returns the cached copy when present; otherwise
 *  hits the CDN, populates both caches, and resolves. Concurrent
 *  callers for the same id share one fetch promise. */
export async function fetchWordlist(id: WordlistId): Promise<WordlistFile> {
  const cached = memCache.get(id);
  if (cached) return cached;
  const pending = inFlight.get(id);
  if (pending) return pending;

  const promise = (async () => {
    // Try localStorage first — cheap and cross-session.
    const stored = readFromLocalStorage(id);
    if (stored) {
      memCache.set(id, stored);
      return stored;
    }
    const res = await fetch(`${CDN_BASE}/${id}.json`, {
      cache: "force-cache",
    });
    if (!res.ok) {
      throw new Error(
        `wordlist fetch failed (${id}): ${res.status} ${res.statusText}`,
      );
    }
    const body = (await res.json()) as WordlistFile;
    memCache.set(id, body);
    writeToLocalStorage(id, body);
    return body;
  })();

  inFlight.set(id, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(id);
  }
}

/** Synchronous read of the in-memory cache. Useful for places that
 *  need to render *some* word list immediately and can fall back to
 *  the English-1k embedded set while the real one loads. */
export function getCachedWordlist(id: WordlistId): WordlistFile | null {
  return memCache.get(id) ?? null;
}

function readFromLocalStorage(id: WordlistId): WordlistFile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_PREFIX + id);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { words?: unknown }).words)
    ) {
      return parsed as WordlistFile;
    }
  } catch {
    /* corrupted / quota — fall through */
  }
  return null;
}

function writeToLocalStorage(id: WordlistId, body: WordlistFile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_PREFIX + id, JSON.stringify(body));
  } catch {
    /* quota — the in-memory cache is enough for the session */
  }
}
