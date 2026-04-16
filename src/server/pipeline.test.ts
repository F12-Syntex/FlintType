import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { defineRoute } from './defineRoute';
import { runRoute } from './pipeline';
import type { Middleware } from './types';

const fakeReq = () =>
  new NextRequest('http://localhost/api/x/y', { method: 'POST' });

describe('runRoute', () => {
  it('calls handler and returns its result', async () => {
    const route = defineRoute<void, { hi: true }>({
      handler: () => ({ hi: true }),
    });
    const out = await runRoute(route, { input: undefined, req: fakeReq() });
    expect(out).toEqual({ hi: true });
  });

  it('validates input before calling handler', async () => {
    const route = defineRoute<number, number>({
      validate: (v) => {
        if (typeof v !== 'number') throw new Error('need number');
        return v;
      },
      handler: ({ input }) => input * 2,
    });
    await expect(
      runRoute(route, { input: 'nope', req: fakeReq() }),
    ).rejects.toThrow('need number');
    expect(await runRoute(route, { input: 3, req: fakeReq() })).toBe(6);
  });

  it('runs global and per-route middleware in onion order', async () => {
    const order: string[] = [];
    const mk = (tag: string): Middleware => async (_ctx, next) => {
      order.push(`${tag}:before`);
      const result = await next();
      order.push(`${tag}:after`);
      return result;
    };
    const route = defineRoute<void, string>({
      middleware: [mk('route')],
      handler: () => {
        order.push('handler');
        return 'x';
      },
    });
    await runRoute(route, { input: undefined, req: fakeReq() }, [mk('global')]);
    expect(order).toEqual([
      'global:before',
      'route:before',
      'handler',
      'route:after',
      'global:after',
    ]);
  });

  it('middleware can short-circuit by not calling next', async () => {
    const gate: Middleware = async () => 'blocked';
    const handler = vi.fn(() => 'never');
    const route = defineRoute<void, string>({
      middleware: [gate],
      handler,
    });
    const out = await runRoute(route, { input: undefined, req: fakeReq() });
    expect(out).toBe('blocked');
    expect(handler).not.toHaveBeenCalled();
  });

  it('exposes shared meta bag across middleware', async () => {
    const writer: Middleware = async (ctx, next) => {
      ctx.meta.userId = 'u_42';
      return next();
    };
    const route = defineRoute<void, string>({
      middleware: [writer],
      handler: ({ meta }) => String(meta.userId),
    });
    const out = await runRoute(route, { input: undefined, req: fakeReq() });
    expect(out).toBe('u_42');
  });
});
