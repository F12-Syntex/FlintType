import type { Middleware, NamespaceDef, NamespaceRecord } from './types';

export function defineNamespace<R extends NamespaceRecord>(def: {
  middleware?: Middleware[];
  routes: R;
}): NamespaceDef<R> {
  return {
    __kind: 'namespace',
    middleware: def.middleware ?? [],
    routes: def.routes,
  };
}
