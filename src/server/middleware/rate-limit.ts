import { BackendError } from '@/lib/errors';
import type { Middleware, RouteContext } from '../types';

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  key?: (ctx: RouteContext) => string;
};

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Exposed for tests.
export function _resetRateLimitStore(): void {
  buckets.clear();
}

function defaultKey(ctx: RouteContext): string {
  const userId = ctx.meta.userId;
  if (typeof userId === 'string' && userId.length > 0) return `u:${userId}`;
  const h = ctx.req.headers;
  const fwd = h.get('x-forwarded-for');
  if (fwd) return `ip:${fwd.split(',')[0]!.trim()}`;
  const real = h.get('x-real-ip');
  if (real) return `ip:${real.trim()}`;
  return 'ip:anon';
}

/**
 * In-memory fixed-window rate limiter. Keyed by Clerk user id when the caller
 * is authenticated (requires `requireAuth` earlier in the chain), otherwise by
 * the first IP found on `x-forwarded-for` / `x-real-ip`. Falls back to a shared
 * `ip:anon` bucket so misconfigured deployments fail closed rather than open.
 *
 * Throws `BackendError(429, 'RATE_LIMITED', …, { limit, windowMs, retryAfterMs })`.
 */
export function rateLimit(opts: RateLimitOptions): Middleware {
  const { limit, windowMs, key = defaultKey } = opts;
  if (limit <= 0) throw new Error('rateLimit: limit must be > 0');
  if (windowMs <= 0) throw new Error('rateLimit: windowMs must be > 0');

  return async (ctx, next) => {
    const bucketKey = `${limit}:${windowMs}:${key(ctx)}`;
    const now = Date.now();
    const existing = buckets.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (existing.count >= limit) {
      const retryAfterMs = existing.resetAt - now;
      ctx.log.warn('rate limit exceeded', {
        key: bucketKey,
        limit,
        windowMs,
        retryAfterMs,
      });
      throw new BackendError(
        429,
        'RATE_LIMITED',
        `Too many requests — retry in ${Math.ceil(retryAfterMs / 1000)}s`,
        { limit, windowMs, retryAfterMs },
      );
    }

    existing.count += 1;
    return next();
  };
}
