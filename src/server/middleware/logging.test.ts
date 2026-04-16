import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import type { Database } from '@/db/server';
import { BackendError } from '@/lib/errors';
import { logger } from '../logger';
import type { RouteContext } from '../types';
import { logging } from './logging';

const fakeDb = {} as Database;

function ctx(): RouteContext {
  return {
    input: undefined,
    req: new NextRequest('http://localhost/api/x/y', { method: 'POST' }),
    meta: {},
    log: logger,
    db: fakeDb,
  };
}

describe('logging middleware', () => {
  it('mints a uuid requestId onto ctx.meta when upstream did not set one', async () => {
    const c = ctx();
    await logging(c, async () => 'ok');
    expect(typeof c.meta.requestId).toBe('string');
    expect(c.meta.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('replaces ctx.log with a child logger when upstream did not set one', async () => {
    const c = ctx();
    const original = c.log;
    await logging(c, async () => 'ok');
    expect(c.log).not.toBe(original);
  });

  it('reuses an upstream requestId without overwriting ctx.log', async () => {
    const upstream: RouteContext = {
      ...ctx(),
      meta: { requestId: 'upstream-id' },
    };
    const originalLog = upstream.log;
    await logging(upstream, async () => 'ok');
    expect(upstream.meta.requestId).toBe('upstream-id');
    expect(upstream.log).toBe(originalLog);
  });

  it('returns the result of next()', async () => {
    const c = ctx();
    const result = await logging(c, async () => ({ ok: true, n: 1 }));
    expect(result).toEqual({ ok: true, n: 1 });
  });

  it('re-throws BackendError without swallowing it', async () => {
    const err = new BackendError(404, 'NOT_FOUND', 'gone');
    await expect(
      logging(ctx(), async () => {
        throw err;
      }),
    ).rejects.toBe(err);
  });

  it('re-throws unknown errors without swallowing them', async () => {
    const err = new Error('boom');
    await expect(
      logging(ctx(), async () => {
        throw err;
      }),
    ).rejects.toBe(err);
  });
});
