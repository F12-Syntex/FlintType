import { PGlite } from '@electric-sql/pglite';
import { neon } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { env, IS_PROD, IS_TEST } from '@/server/env';
import * as schema from '@/db/schema/server';

export type ServerDrizzle =
  | ReturnType<typeof drizzleNeon<typeof schema>>
  | ReturnType<typeof drizzlePglite<typeof schema>>;

export type DriverMode = 'neon' | 'pglite';

export function selectDriverMode(): DriverMode {
  if (env.DATABASE_MODE === 'neon') return 'neon';
  if (env.DATABASE_MODE === 'pglite') return 'pglite';
  if (env.DATABASE_URL) return 'neon';
  if (IS_PROD) {
    throw new Error(
      'DATABASE_URL is required in production when DATABASE_MODE=auto. ' +
        'Set it via Vercel Storage (Neon) or explicitly opt into pglite with DATABASE_MODE=pglite.',
    );
  }
  return 'pglite';
}

export function createServerDrizzle(): ServerDrizzle {
  const mode = selectDriverMode();
  if (mode === 'neon') {
    if (!env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for neon driver mode');
    }
    const sql = neon(env.DATABASE_URL);
    return drizzleNeon(sql, { schema });
  }
  const dataDir = IS_TEST ? undefined : env.PGLITE_DATA_DIR;
  const client = new PGlite(dataDir);
  return drizzlePglite(client, { schema });
}
