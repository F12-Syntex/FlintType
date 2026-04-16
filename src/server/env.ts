import { z } from 'zod';

const schema = z.object({
  APP_ENV: z.enum(['development', 'production']).default('development'),
  LOG_ENABLED: z.enum(['true', 'false']).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  SITE_URL: z.string().url().default('http://localhost:3000'),
});

const parsed = schema.safeParse({
  APP_ENV:
    process.env.APP_ENV ??
    (process.env.NODE_ENV === 'production' ? 'production' : 'development'),
  LOG_ENABLED: process.env.LOG_ENABLED,
  LOG_LEVEL: process.env.LOG_LEVEL,
  SITE_URL: process.env.SITE_URL,
});

if (!parsed.success) {
  console.error(
    'Invalid environment variables:',
    parsed.error.flatten().fieldErrors,
  );
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;

export const IS_DEV = env.APP_ENV === 'development';
export const IS_PROD = env.APP_ENV === 'production';
export const IS_TEST = process.env.NODE_ENV === 'test';

export function logEnabled(): boolean {
  if (env.LOG_ENABLED === 'false') return false;
  if (env.LOG_ENABLED === 'true') return true;
  return !IS_TEST; // default: on everywhere except vitest
}

export function logLevel(): 'debug' | 'info' | 'warn' | 'error' {
  return env.LOG_LEVEL ?? (IS_DEV ? 'debug' : 'info');
}
