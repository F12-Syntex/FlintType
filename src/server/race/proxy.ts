import { BackendError, type ErrorCode } from '@/lib/errors';
import { env, IS_RACE_AUTHORITY } from '@/server/env';
import type { Middleware, RouteContext, RouteHandler } from '@/server/types';

/** Header name carried on every Vercel → Railway proxy hop. Stays in
 *  one place so authority + proxy agree by reference. */
export const RACE_PROXY_SECRET_HEADER = 'x-flinttype-race-secret';
/** Header that preserves the original caller's IP across the proxy
 *  hop. Rate-limit middleware reads `x-forwarded-for` first, so by
 *  passing it through we keep per-real-user buckets on the authority
 *  side instead of every request collapsing onto Vercel's outbound IP. */
const FORWARDED_FOR_HEADER = 'x-forwarded-for';

/** POST the request to the race authority and return its JSON body.
 *  Mirrors the dispatcher's error contract: a 4xx/5xx upstream
 *  response is reconstructed as a `BackendError` of the same shape
 *  the original handler would have thrown, so callers (and the
 *  client `useBackend()` proxy) cannot tell whether the route ran
 *  locally or one hop away.
 *
 *  Always uses the original request's pathname (`/api/race/...`) so
 *  the authority's dispatcher resolves to the same route — no path
 *  rewriting, no per-route URL list to keep in sync. */
export async function proxyToRaceAuthority<O>(
  ctx: RouteContext,
): Promise<O> {
  const base = env.RACE_SERVICE_URL;
  if (!base) {
    throw new BackendError(
      500,
      'INTERNAL',
      'RACE_SERVICE_URL is unset on a non-authority instance — race POSTs cannot be proxied',
    );
  }

  const { pathname } = new URL(ctx.req.url);
  const url = `${base.replace(/\/$/, '')}${pathname}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (env.RACE_PROXY_SECRET) {
    headers[RACE_PROXY_SECRET_HEADER] = env.RACE_PROXY_SECRET;
  }
  // Preserve the caller's IP so the authority's rate-limit middleware
  // buckets per real user, not per Vercel egress address.
  const incomingFwd =
    ctx.req.headers.get(FORWARDED_FOR_HEADER) ??
    ctx.req.headers.get('x-real-ip');
  if (incomingFwd) headers[FORWARDED_FOR_HEADER] = incomingFwd;

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(ctx.input ?? {}),
    });
  } catch (err) {
    ctx.log.error('race proxy upstream unreachable', err, { url });
    throw new BackendError(
      502,
      'INTERNAL',
      'race authority unreachable',
    );
  }

  const raw = await res.text();
  let parsed: unknown = null;
  if (raw.length > 0) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      ctx.log.error('race proxy returned non-JSON', null, {
        url,
        status: res.status,
        sample: raw.slice(0, 200),
      });
      throw new BackendError(
        502,
        'INTERNAL',
        'race authority returned non-JSON',
      );
    }
  }

  if (!res.ok) {
    const body = (parsed ?? {}) as {
      error?: string;
      code?: ErrorCode;
      details?: Record<string, unknown>;
    };
    throw new BackendError(
      res.status,
      body.code ?? 'INTERNAL',
      body.error ?? `race authority returned ${res.status}`,
      body.details,
    );
  }

  return parsed as O;
}

/** Wrap a local handler so it executes only when this instance owns
 *  the race store. Off-authority instances proxy to the authority
 *  via `proxyToRaceAuthority`. The wrapped handler keeps the exact
 *  same input/output type, so route definitions don't change.
 *
 *  Usage:
 *    handler: raceHandler<QueueInput, QueueOutput>(async ({ input }) => {...})
 */
export function raceHandler<I, O>(
  local: RouteHandler<I, O>,
): RouteHandler<I, O> {
  return async (ctx) => {
    if (!IS_RACE_AUTHORITY) {
      return proxyToRaceAuthority<O>(ctx);
    }
    return local(ctx);
  };
}

/** Middleware that locks the race namespace down to callers carrying
 *  the configured proxy secret. Only meaningful on the authority
 *  instance:
 *
 *    - On non-authority instances, race handlers never reach this
 *      middleware (they proxy before any local pipeline runs).
 *    - On the authority with `RACE_PROXY_SECRET` unset (local dev),
 *      every caller is allowed — keeps the dev workflow zero-config.
 *    - On the authority with `RACE_PROXY_SECRET` set, only requests
 *      carrying a matching `x-flinttype-race-secret` header pass.
 *      Anything else gets 401 so a publicly-reachable Railway URL
 *      can't be hammered directly.
 */
export const requireRaceProxySecret: Middleware = async (ctx, next) => {
  if (!IS_RACE_AUTHORITY) return next();
  const expected = env.RACE_PROXY_SECRET;
  if (!expected) return next();
  const got = ctx.req.headers.get(RACE_PROXY_SECRET_HEADER);
  if (got !== expected) {
    ctx.log.warn('race proxy secret mismatch', { hasHeader: got != null });
    throw new BackendError(
      401,
      'UNAUTHORIZED',
      'race authority requires the proxy secret',
    );
  }
  return next();
};
