import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetSseLimitForTests,
  acquireSseSlot,
  MAX_SSE_PER_IP,
  MAX_SSE_TOTAL,
  sseStats,
} from "./sse-limit";

beforeEach(() => {
  __resetSseLimitForTests();
});

describe("acquireSseSlot", () => {
  it("grants a slot for a fresh IP and tracks counts", () => {
    const r = acquireSseSlot("1.2.3.4");
    expect(r.ok).toBe(true);
    expect(sseStats()).toEqual({ total: 1, ipBuckets: 1 });
  });

  it("release decrements counts and frees the IP bucket when it hits zero", () => {
    const r = acquireSseSlot("1.2.3.4");
    if (!r.ok) throw new Error("unreachable");
    r.release();
    expect(sseStats()).toEqual({ total: 0, ipBuckets: 0 });
  });

  it("denies past MAX_SSE_PER_IP for one IP, lets other IPs through", () => {
    for (let i = 0; i < MAX_SSE_PER_IP; i++) {
      const r = acquireSseSlot("1.2.3.4");
      expect(r.ok).toBe(true);
    }
    const blocked = acquireSseSlot("1.2.3.4");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.reason).toBe("per-ip");
      expect(blocked.cap).toBe(MAX_SSE_PER_IP);
    }
    // A different IP still works.
    const other = acquireSseSlot("5.6.7.8");
    expect(other.ok).toBe(true);
  });

  it("denies past MAX_SSE_TOTAL across all IPs", () => {
    // Use enough IPs that no single IP hits the per-IP cap first.
    // Saturate to exactly MAX_SSE_TOTAL, then ask for one more from
    // a fresh IP — that one should deny with reason 'total'.
    const ipsNeeded = Math.ceil(MAX_SSE_TOTAL / MAX_SSE_PER_IP);
    for (let i = 0; i < ipsNeeded; i++) {
      for (let s = 0; s < MAX_SSE_PER_IP; s++) {
        const r = acquireSseSlot(`ip-${i}`);
        if (!r.ok) throw new Error(`saturation attempt failed: ${r.reason}`);
      }
    }
    expect(sseStats().total).toBe(MAX_SSE_TOTAL);
    const over = acquireSseSlot("fresh-ip");
    expect(over.ok).toBe(false);
    if (!over.ok) {
      expect(over.reason).toBe("total");
      expect(over.cap).toBe(MAX_SSE_TOTAL);
    }
  });

  it("release is idempotent (cancel + onerror can race)", () => {
    const r = acquireSseSlot("1.2.3.4");
    if (!r.ok) throw new Error("unreachable");
    r.release();
    r.release();
    expect(sseStats()).toEqual({ total: 0, ipBuckets: 0 });
  });

  it("releasing one of several slots for an IP keeps the bucket", () => {
    const a = acquireSseSlot("1.2.3.4");
    const b = acquireSseSlot("1.2.3.4");
    if (!a.ok || !b.ok) throw new Error("unreachable");
    a.release();
    expect(sseStats()).toEqual({ total: 1, ipBuckets: 1 });
    b.release();
    expect(sseStats()).toEqual({ total: 0, ipBuckets: 0 });
  });
});
