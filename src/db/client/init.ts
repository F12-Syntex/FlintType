'use client';

import { sql } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/pglite';
import type * as schema from '@/db/schema/client';

/**
 * Idempotently creates the browser tables. Called once on first query.
 * No journal / no migration files — CREATE TABLE IF NOT EXISTS is enough
 * because each user's browser DB is isolated and short-lived relative to
 * schema changes.
 */
export async function ensureClientSchema(
  drz: ReturnType<typeof drizzle<typeof schema>>,
): Promise<void> {
  await drz.execute(sql`
    CREATE TABLE IF NOT EXISTS "notes" (
      "id" text PRIMARY KEY NOT NULL,
      "title" text NOT NULL,
      "body" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);
}
