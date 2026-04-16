import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/db/schema/server';
import { createDatabase, type Database } from './index';

/**
 * Creates an in-memory Postgres (PGlite) with the server schema applied.
 * Used by repository tests. Each call is an isolated database — no shared
 * state across tests.
 */
export async function createTestDatabase(): Promise<{
  db: Database;
  reset: () => Promise<void>;
  close: () => Promise<void>;
}> {
  const client = new PGlite();
  const drz = drizzle(client, { schema });
  await applyServerSchema(drz);

  return {
    db: createDatabase(drz),
    reset: async () => {
      await drz.execute(sql`TRUNCATE TABLE posts RESTART IDENTITY CASCADE`);
    },
    close: async () => {
      await client.close();
    },
  };
}

// Runs the same SQL as migrations/server/0000_initial.sql but inline so tests
// don't depend on the on-disk migration journal (which drizzle-kit manages).
async function applyServerSchema(
  drz: ReturnType<typeof drizzle<typeof schema>>,
): Promise<void> {
  await drz.execute(sql`
    CREATE TABLE IF NOT EXISTS "posts" (
      "id" text PRIMARY KEY NOT NULL,
      "title" text NOT NULL,
      "body" text NOT NULL,
      "author_id" text NOT NULL,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);
}
