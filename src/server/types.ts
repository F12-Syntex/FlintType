import type { NextRequest } from 'next/server';

export type RouteContext<I = unknown> = {
  input: I;
  req: NextRequest;
  meta: Record<string, unknown>;
};

export type RouteHandler<I, O> = (ctx: RouteContext<I>) => Promise<O> | O;

export type MiddlewareNext = () => Promise<unknown>;

export type Middleware = (
  ctx: RouteContext,
  next: MiddlewareNext,
) => Promise<unknown>;

export type Validator<I> = (input: unknown) => I;

export type RouteDef<I = unknown, O = unknown> = {
  handler: RouteHandler<I, O>;
  validate?: Validator<I>;
  middleware?: Middleware[];
};
