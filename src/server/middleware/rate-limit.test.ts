import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@/db/server';
import { BackendError } from '@/lib/errors';
import { logger } from '../logger';
import type { RouteContext } from '../types';
import {
  _rateLimitStoreSize,
  _resetRateLimitStore,
  _sweepRateLimitStore,
  rateLimit,
} from './rate-limit';

const fakeDb = {} as Database;

function ctx(opts: {
  meta?: Record<string, unknown>;
  headers?: Record<string, string>;
} = {}): RouteContext {
  return {
    input: undefined,
    req: new NextRequest('http://localhost/api/x/y', {
      method: 'POST',
      headers: opts.headers,
    }),
    meta: opts.meta ?? {},
    log: logger,
    db: fakeDb,
  };
}

beforeEach(() => {
  _resetRateLimitStore();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('rateLimit', () => {
  it('allows requests up to the limit then throws RATE_LIMITED', async () => {
    const mw = rateLimit({ limit: 2, windowMs: 60_000 });
    const next = vi.fn(async () => 'ok');
    const c = ctx({ meta: { userId: 'user_a' } });

    await expect(mw(c, next)).resolves.toBe('ok');
    await expect(mw(c, next)).resolves.toBe('ok');
    await expect(mw(c, next)).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 429 &&
        e.code === 'RATE_LIMITED',
    );
    expect(next).toHaveBeenCalledTimes(2);
  });

  it('resets after the window elapses', async () => {
    const mw = rateLimit({ limit: 1, windowMs: 1_000 });
    const c = ctx({ meta: { userId: 'user_b' } });

    await expect(mw(c, async () => 'ok')).resolves.toBe('ok');
    await expect(mw(c, async () => 'ok')).rejects.toBeInstanceOf(BackendError);

    vi.advanceTimersByTime(1_001);

    await expect(mw(c, async () => 'ok')).resolves.toBe('ok');
  });

  it('buckets per user — different userIds do not share', async () => {
    const mw = rateLimit({ limit: 1, windowMs: 60_000 });
    await expect(
      mw(ctx({ meta: { userId: 'user_a' } }), async () => 'ok'),
    ).resolves.toBe('ok');
    await expect(
      mw(ctx({ meta: { userId: 'user_b' } }), async () => 'ok'),
    ).resolves.toBe('ok');
  });

  it('falls back to x-forwarded-for when unauthenticated', async () => {
    const mw = rateLimit({ limit: 1, windowMs: 60_000 });
    const a = ctx({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } });
    const b = ctx({ headers: { 'x-forwarded-for': '9.9.9.9' } });

    await expect(mw(a, async () => 'ok')).resolves.toBe('ok');
    await expect(mw(b, async () => 'ok')).resolves.toBe('ok');
    await expect(
      mw(ctx({ headers: { 'x-forwarded-for': '1.2.3.4' } }), async () => 'ok'),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it('isolates buckets per (limit, windowMs, key) tuple', async () => {
    const tight = rateLimit({ limit: 1, windowMs: 60_000 });
    const loose = rateLimit({ limit: 5, windowMs: 60_000 });
    const c = ctx({ meta: { userId: 'user_a' } });

    await expect(tight(c, async () => 'ok')).resolves.toBe('ok');
    await expect(tight(c, async () => 'ok')).rejects.toBeInstanceOf(BackendError);
    await expect(loose(c, async () => 'ok')).resolves.toBe('ok');
    await expect(loose(c, async () => 'ok')).resolves.toBe('ok');
  });

  it('attaches retryAfterMs/limit/windowMs details', async () => {
    const mw = rateLimit({ limit: 1, windowMs: 5_000 });
    const c = ctx({ meta: { userId: 'user_c' } });
    await mw(c, async () => 'ok');
    await expect(mw(c, async () => 'ok')).rejects.toSatisfy((e: unknown) => {
      if (!(e instanceof BackendError)) return false;
      const d = e.details as {
        limit: number;
        windowMs: number;
        retryAfterMs: number;
      };
      return (
        d.limit === 1 &&
        d.windowMs === 5_000 &&
        d.retryAfterMs > 0 &&
        d.retryAfterMs <= 5_000
      );
    });
  });

  it('does not call next on rejection', async () => {
    const mw = rateLimit({ limit: 1, windowMs: 60_000 });
    const c = ctx({ meta: { userId: 'user_d' } });
    const next = vi.fn(async () => 'ok');
    await mw(c, next);
    await expect(mw(c, next)).rejects.toBeInstanceOf(BackendError);
    expect(next).toHaveBeenCalledOnce();
  });

  it('rejects invalid options', () => {
    expect(() => rateLimit({ limit: 0, windowMs: 1 })).toThrow();
    expect(() => rateLimit({ limit: 1, windowMs: 0 })).toThrow();
  });

  it('sweep removes expired buckets and keeps active ones', async () => {
    const mw = rateLimit({ limit: 1, windowMs: 1_000 });
    await mw(ctx({ headers: { 'x-forwarded-for': '1.1.1.1' } }), async () => 'ok');
    await mw(ctx({ headers: { 'x-forwarded-for': '2.2.2.2' } }), async () => 'ok');
    expect(_rateLimitStoreSize()).toBe(2);

    // Advance past the window of the first bucket only.
    vi.advanceTimersByTime(1_500);
    await mw(ctx({ headers: { 'x-forwarded-for': '2.2.2.2' } }), async () => 'ok');
    // 2.2.2.2's bucket auto-resets via the in-line lazy path; 1.1.1.1's
    // expired bucket is still sitting in the map until sweep runs.
    expect(_rateLimitStoreSize()).toBe(2);

    _sweepRateLimitStore();
    // 1.1.1.1's expired entry gone; 2.2.2.2 still active.
    expect(_rateLimitStoreSize()).toBe(1);
  });
});
