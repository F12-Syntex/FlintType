/** A small per-user cache for playground word scores, so revisiting
 *  /insights (or typing while a batch is still in flight) doesn't spend
 *  the per-user `adapt.scoreWord` rate-limit budget re-scoring words it
 *  already knows. Pure and dependency-injected so it can be unit-tested
 *  (ui-law §1.3 exception).
 *
 *  - Fresh results are kept for `ttlMs` (the model only shifts when the
 *    user finishes another test, so a few minutes is safe).
 *  - A word already being fetched shares the in-flight promise instead
 *    of firing a second request.
 *  - Failures are not cached, so a rate-limited word retries later.
 *  - Keys include the user id, so a different account on the same tab
 *    never sees someone else's scores. */

export type CacheStorage<T> = {
  read(userId: string): Record<string, { value: T; at: number }> | null;
  write(userId: string, entries: Record<string, { value: T; at: number }>): void;
};

export type ScoreCache<T> = {
  /** A fresh cached value, or undefined. Never triggers a fetch. */
  peek(userId: string, word: string): T | undefined;
  /** The cached value, the in-flight request, or a new request. */
  load(userId: string, word: string, fetcher: () => Promise<T>): Promise<T>;
};

const DEFAULT_TTL_MS = 10 * 60_000;
/** Per-user cap; the oldest entries go first. */
const MAX_ENTRIES = 300;

export function createScoreCache<T>({
  ttlMs = DEFAULT_TTL_MS,
  now = () => Date.now(),
  storage,
}: {
  ttlMs?: number;
  now?: () => number;
  storage?: CacheStorage<T>;
} = {}): ScoreCache<T> {
  const users = new Map<string, Map<string, { value: T; at: number }>>();
  const pending = new Map<string, Promise<T>>();

  function entriesFor(userId: string) {
    let map = users.get(userId);
    if (!map) {
      map = new Map(Object.entries(storage?.read(userId) ?? {}));
      users.set(userId, map);
    }
    return map;
  }

  function peek(userId: string, word: string): T | undefined {
    const map = entriesFor(userId);
    const hit = map.get(word);
    if (!hit) return undefined;
    if (now() - hit.at > ttlMs) {
      map.delete(word);
      return undefined;
    }
    return hit.value;
  }

  function store(userId: string, word: string, value: T) {
    const map = entriesFor(userId);
    map.delete(word);
    map.set(word, { value, at: now() });
    while (map.size > MAX_ENTRIES) {
      const oldest = map.keys().next().value;
      if (oldest === undefined) break;
      map.delete(oldest);
    }
    storage?.write(userId, Object.fromEntries(map));
  }

  function load(userId: string, word: string, fetcher: () => Promise<T>) {
    const hit = peek(userId, word);
    if (hit !== undefined) return Promise.resolve(hit);
    const key = `${userId}\u0000${word}`;
    const inflight = pending.get(key);
    if (inflight) return inflight;
    const request = fetcher()
      .then((value) => {
        store(userId, word, value);
        return value;
      })
      .finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
  }

  return { peek, load };
}

/** sessionStorage adapter. Every access is guarded: storage can be
 *  missing, full or blocked (private windows), and the cache must keep
 *  working in memory when it is. */
export function sessionScoreStorage<T>(prefix: string): CacheStorage<T> {
  return {
    read(userId) {
      try {
        const raw = globalThis.sessionStorage?.getItem(`${prefix}${userId}`);
        return raw ? (JSON.parse(raw) as Record<string, { value: T; at: number }>) : null;
      } catch {
        return null;
      }
    },
    write(userId, entries) {
      try {
        globalThis.sessionStorage?.setItem(`${prefix}${userId}`, JSON.stringify(entries));
      } catch {
        // Quota or blocked storage: the in-memory cache still works.
      }
    },
  };
}
