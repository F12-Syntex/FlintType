import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type CacheStorage,
  createScoreCache,
  sessionScoreStorage,
} from "./score-cache";

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("createScoreCache", () => {
  it("fetches once, then serves the cached value", async () => {
    const cache = createScoreCache<number>();
    const fetcher = vi.fn(async () => 42);
    expect(await cache.load("u1", "the", fetcher)).toBe(42);
    expect(await cache.load("u1", "the", fetcher)).toBe(42);
    expect(cache.peek("u1", "the")).toBe(42);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("shares an in-flight request instead of firing a second one", async () => {
    const cache = createScoreCache<number>();
    let resolve!: (v: number) => void;
    const fetcher = vi.fn(
      () => new Promise<number>((r) => (resolve = r)),
    );
    const a = cache.load("u1", "fox", fetcher);
    const b = cache.load("u1", "fox", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cache.peek("u1", "fox")).toBeUndefined();
    resolve(7);
    expect(await Promise.all([a, b])).toEqual([7, 7]);
  });

  it("does not cache failures, so the word retries later", async () => {
    const cache = createScoreCache<number>();
    const failing = vi.fn(async () => {
      throw new Error("rate limited");
    });
    await expect(cache.load("u1", "dog", failing)).rejects.toThrow("rate limited");
    expect(cache.peek("u1", "dog")).toBeUndefined();
    const ok = vi.fn(async () => 3);
    expect(await cache.load("u1", "dog", ok)).toBe(3);
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it("expires entries after the TTL", async () => {
    const c = clock();
    const cache = createScoreCache<number>({ ttlMs: 1000, now: c.now });
    await cache.load("u1", "lazy", async () => 1);
    c.advance(999);
    expect(cache.peek("u1", "lazy")).toBe(1);
    c.advance(2);
    expect(cache.peek("u1", "lazy")).toBeUndefined();
    const fetcher = vi.fn(async () => 2);
    expect(await cache.load("u1", "lazy", fetcher)).toBe(2);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps each user's scores separate", async () => {
    const cache = createScoreCache<number>();
    await cache.load("u1", "the", async () => 1);
    expect(cache.peek("u2", "the")).toBeUndefined();
    expect(await cache.load("u2", "the", async () => 2)).toBe(2);
    expect(cache.peek("u1", "the")).toBe(1);
  });

  it("restores from and writes through to storage", async () => {
    const saved: Record<string, Record<string, { value: number; at: number }>> = {
      u1: { over: { value: 9, at: 0 } },
    };
    const storage: CacheStorage<number> = {
      read: (u) => saved[u] ?? null,
      write: (u, entries) => {
        saved[u] = entries;
      },
    };
    const cache = createScoreCache<number>({ storage, now: () => 10 });
    expect(cache.peek("u1", "over")).toBe(9);
    await cache.load("u1", "jumps", async () => 5);
    expect(saved.u1).toEqual({
      over: { value: 9, at: 0 },
      jumps: { value: 5, at: 10 },
    });
  });
});

describe("sessionScoreStorage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("round-trips entries per user under the prefix", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    });
    const storage = sessionScoreStorage<number>("ft:test:");
    expect(storage.read("u1")).toBeNull();
    storage.write("u1", { the: { value: 1, at: 5 } });
    expect([...data.keys()]).toEqual(["ft:test:u1"]);
    expect(storage.read("u1")).toEqual({ the: { value: 1, at: 5 } });
    expect(storage.read("u2")).toBeNull();
  });

  it("keeps the cache working when storage throws or is corrupt", async () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => "{not json",
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    });
    const storage = sessionScoreStorage<number>("ft:test:");
    expect(storage.read("u1")).toBeNull();
    expect(() => storage.write("u1", {})).not.toThrow();
    const cache = createScoreCache<number>({ storage });
    expect(await cache.load("u1", "brown", async () => 4)).toBe(4);
    expect(cache.peek("u1", "brown")).toBe(4);
  });

  it("works when sessionStorage does not exist", () => {
    vi.stubGlobal("sessionStorage", undefined);
    const storage = sessionScoreStorage<number>("ft:test:");
    expect(storage.read("u1")).toBeNull();
    expect(() => storage.write("u1", {})).not.toThrow();
  });
});
