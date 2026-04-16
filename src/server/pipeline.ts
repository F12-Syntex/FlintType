import { getDatabase, type Database } from '@/db/server';
import { logger, type Logger } from './logger';
import type { Middleware, RouteContext, RouteDef } from './types';

export async function runRoute<I, O>(
  route: RouteDef<I, O>,
  ctx: {
    input: unknown;
    req: RouteContext['req'];
    meta?: Record<string, unknown>;
    log?: Logger;
    db?: Database;
  },
  extraMiddleware: Middleware[] = [],
): Promise<O> {
  const full: RouteContext = {
    input: ctx.input,
    req: ctx.req,
    meta: ctx.meta ?? {},
    log: ctx.log ?? logger,
    db: ctx.db ?? getDatabase(),
  };
  const chain: Middleware[] = [
    ...extraMiddleware,
    ...(route.middleware ?? []),
  ];

  let idx = -1;
  const dispatch = async (): Promise<unknown> => {
    idx++;
    if (idx < chain.length) {
      return chain[idx](full, dispatch);
    }
    const validated = route.input
      ? route.input.parse(full.input)
      : (full.input as I);
    return route.handler({
      input: validated,
      req: full.req,
      meta: full.meta,
      log: full.log,
      db: full.db,
    });
  };

  return (await dispatch()) as O;
}
