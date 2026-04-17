import { beforeEach, describe, expect, it } from 'vitest';
import { BackendError } from '@/lib/errors';
import { _resetRateLimitStore } from '@/server/middleware/rate-limit';
import { callRoute } from '@/server/testing';
import type { RateLimitPingOutput } from '@/types/ratelimit';

beforeEach(() => {
  _resetRateLimitStore();
});

describe('ratelimit.ping', () => {
  it('returns ok with the configured limit + window', async () => {
    const out = await callRoute<RateLimitPingOutput>(['ratelimit', 'ping'], {
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });
    expect(out.ok).toBe(true);
    expect(out.limit).toBe(5);
    expect(out.windowMs).toBe(10_000);
    expect(typeof out.ts).toBe('number');
  });

  it('throws RATE_LIMITED after the budget is exhausted for one IP', async () => {
    const headers = { 'x-forwarded-for': '10.0.0.2' };
    for (let i = 0; i < 5; i++) {
      await callRoute(['ratelimit', 'ping'], { headers });
    }
    await expect(
      callRoute(['ratelimit', 'ping'], { headers }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 429 &&
        e.code === 'RATE_LIMITED',
    );
  });

  it('buckets per IP independently', async () => {
    for (let i = 0; i < 5; i++) {
      await callRoute(['ratelimit', 'ping'], {
        headers: { 'x-forwarded-for': '10.0.0.3' },
      });
    }
    // different IP — fresh bucket
    const out = await callRoute<RateLimitPingOutput>(['ratelimit', 'ping'], {
      headers: { 'x-forwarded-for': '10.0.0.4' },
    });
    expect(out.ok).toBe(true);
  });
});
