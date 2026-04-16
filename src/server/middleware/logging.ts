import { randomUUID } from 'node:crypto';
import { BackendError } from '@/lib/errors';
import { logger } from '../logger';
import type { Middleware } from '../types';

export const logging: Middleware = async (ctx, next) => {
  const requestId = randomUUID();
  const path = new URL(ctx.req.url).pathname;
  const child = logger.child({
    requestId,
    method: ctx.req.method,
    path,
  });
  ctx.log = child;
  ctx.meta.requestId = requestId;

  const start = Date.now();
  child.debug('request start');
  try {
    const result = await next();
    child.info('request ok', { durationMs: Date.now() - start });
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    if (err instanceof BackendError) {
      child.warn('request failed', {
        durationMs,
        status: err.status,
        code: err.code,
      });
    } else {
      child.error('request crashed', err, { durationMs });
    }
    throw err;
  }
};
