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
  /** When `true`, this instance owns the in-memory race-room store and
   *  serves race POSTs + SSE directly. When `false`, race POST handlers
   *  proxy to RACE_SERVICE_URL instead of touching the local store,
   *  and the SSE route returns 410 (the browser is expected to connect
   *  to the authority directly via NEXT_PUBLIC_RACE_SERVICE_URL).
   *
   *  Hybrid deployment shape: Vercel runs the main app with
   *  RACE_AUTHORITY=false; a single Railway instance runs the same
   *  repo with RACE_AUTHORITY=true so the race state lives in one
   *  warm process and cross-instance matchmaking races disappear by
   *  construction. Local dev and tests default to `true` so behaviour
   *  is identical to today's single-process model. */
  RACE_AUTHORITY: z.enum(['true', 'false']).default('true'),
  /** Origin of the race authority instance, e.g.
   *  `https://race.flinttype.com`. Required when RACE_AUTHORITY=false;
   *  ignored otherwise. */
  RACE_SERVICE_URL: z.string().url().optional(),
  /** Shared secret carried in `x-flinttype-race-secret` on every
   *  proxied request. When set on the authority, requests missing or
   *  mismatching this header are rejected with 401 — this locks the
   *  publicly-reachable Railway URL down to traffic that came through
   *  Vercel. When unset (local dev), the authority accepts any
   *  caller. Vercel's RACE_PROXY_SECRET must match Railway's. */
  RACE_PROXY_SECRET: z.string().optional(),
  /** Origin the browser EventSource should connect to for SSE. When
   *  set, the client opens `${NEXT_PUBLIC_RACE_SERVICE_URL}/api/race/
   *  stream/<id>` instead of a same-origin URL. NEXT_PUBLIC_ so it
   *  ships in the client bundle. */
  NEXT_PUBLIC_RACE_SERVICE_URL: z.string().optional(),
  /** Build-time snapshot of the VERSION file, injected via
   *  `next.config.ts`. Server-side reads use this as the fallback
   *  when reading the VERSION file from disk fails (e.g. on a
   *  hosting platform that strips non-bundled files). Client-side
   *  reads still hit `process.env.NEXT_PUBLIC_APP_VERSION` directly
   *  because `src/lib/version.ts` ships in the client bundle and
   *  must not import this server module. */
  NEXT_PUBLIC_APP_VERSION: z.string().default('0.0.0'),
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
  RACE_AUTHORITY: process.env.RACE_AUTHORITY,
  RACE_SERVICE_URL: process.env.RACE_SERVICE_URL,
  RACE_PROXY_SECRET: process.env.RACE_PROXY_SECRET,
  NEXT_PUBLIC_RACE_SERVICE_URL: process.env.NEXT_PUBLIC_RACE_SERVICE_URL,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
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
/** True on the instance that owns the race-room store. False on
 *  proxy instances that forward race POSTs to RACE_SERVICE_URL. */
export const IS_RACE_AUTHORITY = env.RACE_AUTHORITY === 'true';

export function logEnabled(): boolean {
  if (env.LOG_ENABLED === 'false') return false;
  if (env.LOG_ENABLED === 'true') return true;
  return !IS_TEST; // default: on everywhere except vitest
}

export function logLevel(): 'debug' | 'info' | 'warn' | 'error' {
  return env.LOG_LEVEL ?? (IS_DEV ? 'debug' : 'info');
}
