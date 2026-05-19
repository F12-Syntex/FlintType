import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: vi.fn(),
}));

import { clerkClient } from "@clerk/nextjs/server";
import {
  _clerkUserCacheSize,
  _resetClerkUserCache,
  getCachedClerkUser,
  invalidateCachedClerkUser,
} from "./clerk-user-cache";

const mockClerkClient = vi.mocked(clerkClient);

function mockGetUser(impl: (id: string) => unknown) {
  const getUser = vi.fn(async (id: string) => impl(id) as never);
  mockClerkClient.mockResolvedValue({
    users: { getUser },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
  return getUser;
}

beforeEach(() => {
  _resetClerkUserCache();
  mockClerkClient.mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-19T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("clerk-user-cache", () => {
  it("misses then hits — second call inside TTL doesn't re-fetch", async () => {
    const getUser = mockGetUser((id) => ({ id, username: "alice" }));
    const a = await getCachedClerkUser("u_1");
    const b = await getCachedClerkUser("u_1");
    expect(a?.id).toBe("u_1");
    expect(b?.id).toBe("u_1");
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it("re-fetches after the TTL elapses", async () => {
    const getUser = mockGetUser((id) => ({ id, username: "alice" }));
    await getCachedClerkUser("u_1");
    vi.advanceTimersByTime(61_000);
    await getCachedClerkUser("u_1");
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it("invalidateCachedClerkUser forces a re-fetch", async () => {
    const getUser = mockGetUser((id) => ({ id, username: "alice" }));
    await getCachedClerkUser("u_1");
    invalidateCachedClerkUser("u_1");
    await getCachedClerkUser("u_1");
    expect(getUser).toHaveBeenCalledTimes(2);
  });

  it("returns null on Clerk error without poisoning the cache", async () => {
    mockClerkClient.mockRejectedValue(new Error("clerk down"));
    expect(await getCachedClerkUser("u_404")).toBeNull();
    // Cache stays empty so a recovered Clerk gets exercised on the
    // next call.
    expect(_clerkUserCacheSize()).toBe(0);
  });

  it("keys per-user — different ids don't collide", async () => {
    const getUser = mockGetUser((id) => ({ id, username: id }));
    await getCachedClerkUser("u_1");
    await getCachedClerkUser("u_2");
    expect(_clerkUserCacheSize()).toBe(2);
    expect(getUser).toHaveBeenCalledTimes(2);
  });
});
