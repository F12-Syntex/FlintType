import type { NextRequest } from 'next/server';
import type { ZodType } from 'zod';
import type { Database } from '@/db/server';
import type { Logger } from './logger';

export type RouteContext<I = unknown> = {
  input: I;
  req: NextRequest;
  meta: Record<string, unknown>;
  log: Logger;
  db: Database;
};

export type RouteHandler<I, O> = (ctx: RouteContext<I>) => Promise<O> | O;

export type MiddlewareNext = () => Promise<unknown>;

export type Middleware = (
  ctx: RouteContext,
  next: MiddlewareNext,
) => Promise<unknown>;

export type RouteDef<I = unknown, O = unknown> = {
  readonly __kind: 'route';
  handler: RouteHandler<I, O>;
  input?: ZodType<I>;
  middleware?: Middleware[];
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export type AnyRouteDef = RouteDef<any, any>;
export type AnyNamespaceDef = NamespaceDef<any>;
/* eslint-enable @typescript-eslint/no-explicit-any */

export type NamespaceChild = AnyRouteDef | AnyNamespaceDef;
export type NamespaceRecord = Record<string, NamespaceChild>;

export interface NamespaceDef<R extends NamespaceRecord = NamespaceRecord> {
  readonly __kind: 'namespace';
  middleware: Middleware[];
  routes: R;
}
