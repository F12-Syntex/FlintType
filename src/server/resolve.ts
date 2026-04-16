import type {
  AnyNamespaceDef,
  AnyRouteDef,
  Middleware,
  NamespaceChild,
} from './types';

export type ResolvedRoute = {
  route: AnyRouteDef;
  middleware: Middleware[];
};

export function resolvePath(
  root: AnyNamespaceDef,
  path: readonly string[],
): ResolvedRoute | null {
  let current: NamespaceChild = root;
  const middleware: Middleware[] = [];

  for (const segment of path) {
    if (current.__kind === 'route') {
      return null;
    }
    middleware.push(...current.middleware);
    const child: NamespaceChild | undefined = current.routes[segment];
    if (!child) return null;
    current = child;
  }

  if (current.__kind !== 'route') return null;
  return { route: current, middleware };
}
