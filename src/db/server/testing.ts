import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import { createDatabase, type Database } from ".";
import * as schema from "@/db/schema/server";

/** In-memory PGlite Drizzle instance for unit tests. The schema is
 *  applied programmatically via raw SQL — we don't run drizzle-kit's
 *  filesystem migrations in tests because every spec wants a fresh
 *  database, and the migration folder is the production source of
 *  truth, not a per-test fixture. Keep this DDL in lock-step with
 *  `src/db/schema/server/*`. */
const SCHEMA_DDL = `
  CREATE TABLE IF NOT EXISTS user_prefs (
    user_id     text PRIMARY KEY,
    data        jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at  timestamp NOT NULL DEFAULT now()
  );
`;

export async function createTestDatabase(): Promise<{
  db: Database;
  reset: () => Promise<void>;
  close: () => Promise<void>;
}> {
  const client = new PGlite();
  const drizzleDb = drizzle(client, { schema });
  await drizzleDb.execute(sql.raw(SCHEMA_DDL));
  const db = createDatabase(drizzleDb, "pglite");
  return {
    db,
    reset: async () => {
      await drizzleDb.execute(sql.raw("TRUNCATE user_prefs"));
    },
    close: async () => {
      await client.close();
    },
  };
}
