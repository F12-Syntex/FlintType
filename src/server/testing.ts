import { NextRequest } from 'next/server';
import type { Database } from '@/db/server';
import { runRoute } from './pipeline';
import { resolvePath } from './resolve';
import { router } from './router';

/**
 * Test helper that resolves a route by path, runs the full middleware stack
 * (including namespace-level middleware), and returns the handler result.
 * Does not touch HTTP — purely in-process.
 */
export async function callRoute<O = unknown>(
  path: readonly string[],
  options: {
    input?: unknown;
    headers?: Record<string, string>;
    db?: Database;
  } = {},
): Promise<O> {
  const resolved = resolvePath(router, path);
  if (!resolved) {
    throw new Error(`Unknown route /${path.join('/')}`);
  }
  const req = new NextRequest(`http://localhost/api/${path.join('/')}`, {
    method: 'POST',
    headers: options.headers,
  });
  return runRoute(
    resolved.route,
    { input: options.input, req, db: options.db },
    resolved.middleware,
  ) as Promise<O>;
}
