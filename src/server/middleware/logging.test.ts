import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { BackendError } from '../errors';
import { logger } from '../logger';
import type { RouteContext } from '../types';
import { logging } from './logging';

function ctx(): RouteContext {
  return {
    input: undefined,
    req: new NextRequest('http://localhost/api/x/y', { method: 'POST' }),
    meta: {},
    log: logger,
  };
}

describe('logging middleware', () => {
  it('assigns a uuid requestId onto ctx.meta', async () => {
    const c = ctx();
    await logging(c, async () => 'ok');
    expect(typeof c.meta.requestId).toBe('string');
    expect(c.meta.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it('replaces ctx.log with a child logger', async () => {
    const c = ctx();
    const original = c.log;
    await logging(c, async () => 'ok');
    expect(c.log).not.toBe(original);
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
