import { z } from 'zod';

const schema = z.object({
  APP_ENV: z.enum(['development', 'production']).default('development'),
  LOG_ENABLED: z.enum(['true', 'false']).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  SITE_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().url().optional(),
  DATABASE_MODE: z.enum(['auto', 'neon', 'pglite']).default('auto'),
  PGLITE_DATA_DIR: z.string().default('./.data/pglite'),
  OPENROUTER_API_KEY: z.string().optional(),
  /** AES-256-GCM key (base64, 32 raw bytes) used to encrypt user
   *  third-party API keys at rest (e.g. the MonkeyType Ape Key
   *  stored against a user's profile). Falls back to a deterministic
   *  dev key when unset so the dev workflow doesn't gate on a
   *  generated secret — production must set this explicitly via
   *  `.env.local`. See `src/server/api-key-crypto.ts`. */
  API_KEY_ENC_SECRET: z.string().optional(),
});

const parsed = schema.safeParse({
  APP_ENV:
    process.env.APP_ENV ??
    (process.env.NODE_ENV === 'production' ? 'production' : 'development'),
  LOG_ENABLED: process.env.LOG_ENABLED,
  LOG_LEVEL: process.env.LOG_LEVEL,
  SITE_URL: process.env.SITE_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_MODE: process.env.DATABASE_MODE,
  PGLITE_DATA_DIR: process.env.PGLITE_DATA_DIR,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  API_KEY_ENC_SECRET: process.env.API_KEY_ENC_SECRET,
});

if (!parsed.success) {
  console.error(
    'Invalid environment variables:',
    parsed.error.flatten().fieldErrors,
  );
  throw new Error('Invalid environment variables');
}

/**
 * Hosted-deploy signal. Vercel sets `VERCEL=1` on every function invocation;
 * other hosts typically set `CI=true` during build. Either means we are not
 * on a developer machine, and dev-only bypasses (e.g. `requireAdminOrDev`
 * opening up `admin.database.*` without auth) must not fire — otherwise a
 * misconfigured `APP_ENV=development` in a prod deploy would leak every row
 * in the database to unauthenticated callers.
 */
const isHostedDeploy =
  process.env.VERCEL === '1' || process.env.CI === 'true';

if (isHostedDeploy && parsed.data.APP_ENV === 'development') {
  throw new Error(
    "APP_ENV='development' is not allowed on a hosted deploy " +
      '(VERCEL=1 or CI=true detected). Set APP_ENV=production in the ' +
      'deploy environment — dev-only bypasses would otherwise expose ' +
      'admin surfaces without auth.',
  );
}

export const env = parsed.data;
export const IS_HOSTED_DEPLOY = isHostedDeploy;

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
