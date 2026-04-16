import type { Middleware, RouteDef, RouteHandler } from './types';
import type { ZodType } from 'zod';

export function defineRoute<I, O>(def: {
  handler: RouteHandler<I, O>;
  input?: ZodType<I>;
  middleware?: Middleware[];
}): RouteDef<I, O> {
  return {
    __kind: 'route',
    handler: def.handler,
    input: def.input,
    middleware: def.middleware,
  };
}
