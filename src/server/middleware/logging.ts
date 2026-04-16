import { randomUUID } from 'node:crypto';
import { BackendError } from '@/lib/errors';
import { logger } from '../logger';
import type { Middleware } from '../types';

export const logging: Middleware = async (ctx, next) => {
  // Reuse an upstream requestId (e.g. set by the dispatcher) if present;
  // otherwise mint one so direct callers (tests, internal entry points)
  // still get traceable logs.
  const existingId =
    typeof ctx.meta.requestId === 'string' ? ctx.meta.requestId : undefined;
  if (!existingId) {
    const requestId = randomUUID();
    const path = new URL(ctx.req.url).pathname;
    ctx.log = logger.child({
      requestId,
      method: ctx.req.method,
      path,
    });
    ctx.meta.requestId = requestId;
  }

  const start = Date.now();
  ctx.log.debug('request start');
  try {
    const result = await next();
    ctx.log.info('request ok', { durationMs: Date.now() - start });
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    if (err instanceof BackendError) {
      ctx.log.warn('request failed', {
        durationMs,
        status: err.status,
        code: err.code,
      });
    } else {
      ctx.log.error('request crashed', err, { durationMs });
    }
    throw err;
  }
};
