import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { z, ZodError } from 'zod';
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

  it('validates input with a zod schema before calling handler', async () => {
    const route = defineRoute<{ n: number }, number>({
      input: z.object({ n: z.number() }),
      handler: ({ input }) => input.n * 2,
    });
    expect(await runRoute(route, { input: { n: 3 }, req: fakeReq() })).toBe(6);
    await expect(
      runRoute(route, { input: { n: 'x' }, req: fakeReq() }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it('runs extra (namespace) and per-route middleware in onion order', async () => {
    const order: string[] = [];
    const mk = (tag: string): Middleware => async (_ctx, next) => {
      order.push(`${tag}:before`);
      const r = await next();
      order.push(`${tag}:after`);
      return r;
    };
    const route = defineRoute<void, string>({
      middleware: [mk('route')],
      handler: () => {
        order.push('handler');
        return 'x';
      },
    });
    await runRoute(route, { input: undefined, req: fakeReq() }, [
      mk('outer'),
      mk('inner'),
    ]);
    expect(order).toEqual([
      'outer:before',
      'inner:before',
      'route:before',
      'handler',
      'route:after',
      'inner:after',
      'outer:after',
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

  it('exposes shared meta bag across middleware and handler', async () => {
    const writer: Middleware = async (ctx, next) => {
      ctx.meta.userId = 'u_42';
      return next();
    };
    const route = defineRoute<void, string>({
      handler: ({ meta }) => String(meta.userId),
    });
    const out = await runRoute(
      route,
      { input: undefined, req: fakeReq() },
      [writer],
    );
    expect(out).toBe('u_42');
  });
});
