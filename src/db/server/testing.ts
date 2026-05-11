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
  CREATE TABLE IF NOT EXISTS bigram_models (
    user_id       text NOT NULL,
    bigram        text NOT NULL,
    mean_ms       double precision NOT NULL,
    variance_ms   double precision NOT NULL,
    sample_count  integer NOT NULL,
    updated_at    timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, bigram)
  );
  CREATE TABLE IF NOT EXISTS trigram_models (
    user_id       text NOT NULL,
    trigram       text NOT NULL,
    mean_ms       double precision NOT NULL,
    variance_ms   double precision NOT NULL,
    sample_count  integer NOT NULL,
    updated_at    timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, trigram)
  );
  CREATE TABLE IF NOT EXISTS motor_feature_models (
    user_id       text NOT NULL,
    feature_key   text NOT NULL,
    mean_ms       double precision NOT NULL,
    variance_ms   double precision NOT NULL,
    sample_count  integer NOT NULL,
    updated_at    timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, feature_key)
  );
  CREATE TABLE IF NOT EXISTS word_models (
    user_id       text NOT NULL,
    word          text NOT NULL,
    mean_ms       double precision NOT NULL,
    variance_ms   double precision NOT NULL,
    sample_count  integer NOT NULL,
    updated_at    timestamp NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, word)
  );
  CREATE TABLE IF NOT EXISTS tests (
    id                       text PRIMARY KEY,
    user_id                  text NOT NULL,
    started_at               timestamp NOT NULL,
    completed_at             timestamp,
    mode                     text NOT NULL,
    duration_or_word_count   integer NOT NULL,
    wpm                      double precision NOT NULL,
    accuracy                 double precision NOT NULL,
    error_count              integer NOT NULL,
    reset_count              integer NOT NULL,
    was_completed            boolean NOT NULL
  );
  CREATE INDEX IF NOT EXISTS tests_user_time_idx ON tests (user_id, started_at);
  CREATE TABLE IF NOT EXISTS notifications (
    id          text PRIMARY KEY,
    user_id     text NOT NULL,
    kind        text NOT NULL,
    title       text NOT NULL,
    body        text NOT NULL,
    data        jsonb,
    created_at  timestamp NOT NULL DEFAULT now(),
    read_at     timestamp
  );
  CREATE INDEX IF NOT EXISTS notifications_user_time_idx ON notifications (user_id, created_at);
`;

const TRUNCATE_ALL = `
  TRUNCATE user_prefs, bigram_models, trigram_models, motor_feature_models, word_models, tests, notifications;
`;

/** PGlite's parse-message path rejects multi-statement queries, so we
 *  split on `;` and execute each statement separately. */
function splitStatements(ddl: string): string[] {
  return ddl
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function createTestDatabase(): Promise<{
  db: Database;
  reset: () => Promise<void>;
  close: () => Promise<void>;
}> {
  const client = new PGlite();
  const drizzleDb = drizzle(client, { schema });
  for (const stmt of splitStatements(SCHEMA_DDL)) {
    await drizzleDb.execute(sql.raw(stmt));
  }
  const db = createDatabase(drizzleDb, "pglite");
  return {
    db,
    reset: async () => {
      for (const stmt of splitStatements(TRUNCATE_ALL)) {
        await drizzleDb.execute(sql.raw(stmt));
      }
    },
    close: async () => {
      await client.close();
    },
  };
}
