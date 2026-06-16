import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  __resetClientAuthForTests,
  awaitClientAuth,
  getClientSignedIn,
  setClientSignedIn,
} from "./client-auth";

beforeEach(() => {
  __resetClientAuthForTests();
});

describe("client-auth", () => {
  it("starts unresolved (null) until Clerk publishes a value", () => {
    expect(getClientSignedIn()).toBeNull();
  });

  it("getClientSignedIn reflects the last published value", () => {
    setClientSignedIn(true);
    expect(getClientSignedIn()).toBe(true);
    setClientSignedIn(false);
    expect(getClientSignedIn()).toBe(false);
  });

  it("awaitClientAuth resolves synchronously once resolved", async () => {
    setClientSignedIn(false);
    await expect(awaitClientAuth()).resolves.toBe(false);
  });

  it("awaitClientAuth waits for the first publish when still unresolved", async () => {
    const pending = awaitClientAuth();
    let settled = false;
    void pending.then(() => {
      settled = true;
    });
    // Not resolved yet — no value published.
    await Promise.resolve();
    expect(settled).toBe(false);

    setClientSignedIn(true);
    await expect(pending).resolves.toBe(true);
  });

  it("flushes every queued awaiter on publish", async () => {
    const a = awaitClientAuth();
    const b = awaitClientAuth();
    setClientSignedIn(true);
    await expect(Promise.all([a, b])).resolves.toEqual([true, true]);
  });

  it("falls back to signed-out if Clerk never publishes (no hang)", async () => {
    vi.useFakeTimers();
    try {
      const pending = awaitClientAuth();
      await vi.advanceTimersByTimeAsync(4000);
      await expect(pending).resolves.toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
