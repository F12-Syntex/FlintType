import type { Middleware, RouteContext, RouteDef } from './types';

export async function runRoute<I, O>(
  route: RouteDef<I, O>,
  ctx: { input: unknown; req: RouteContext['req'] },
  globalMiddleware: Middleware[] = [],
): Promise<O> {
  const full: RouteContext = { input: ctx.input, req: ctx.req, meta: {} };
  const chain: Middleware[] = [...globalMiddleware, ...(route.middleware ?? [])];

  let idx = -1;
  const dispatch = async (): Promise<unknown> => {
    idx++;
    if (idx < chain.length) {
      return chain[idx](full, dispatch);
    }
    const validated = route.validate
      ? route.validate(full.input)
      : (full.input as I);
    return route.handler({
      input: validated,
      req: full.req,
      meta: full.meta,
    });
  };

  return (await dispatch()) as O;
}
