import type { Middleware } from '../types';

export const logging: Middleware = async (ctx, next) => {
  const start = Date.now();
  const label = `${ctx.req.method} ${new URL(ctx.req.url).pathname}`;
  try {
    const result = await next();
    if (process.env.NODE_ENV !== 'test') {
      console.log(`${label} ${Date.now() - start}ms`);
    }
    return result;
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`${label} FAILED`, err);
    }
    throw err;
  }
};
