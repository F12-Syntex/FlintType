import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env.local + .env BEFORE anything else imports `@/server/env`,
// which validates DATABASE_URL / DATABASE_MODE at module-init time
// and would otherwise see only the shell environment. tsx doesn't
// auto-load env files. ES module `import` statements are hoisted
// above top-level code, so the migrator imports below have to be
// `await import(...)` instead of static imports — otherwise they'd
// run before the loader.
function loadEnvFile(envPath: string) {
  try {
    const text = readFileSync(envPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* file missing — fine */
  }
}
loadEnvFile('.env.local');
loadEnvFile('.env');

/**
 * Runs pending migrations against whichever driver is selected. Idempotent.
 * Called by the `yarn db:migrate` script and by tests.
 *
 * Loads .env.local + .env (above) so `yarn db:migrate` targets the
 * same Neon DB that `yarn backfill-og` does. Tests import
 * `runServerMigrations` directly — the env loader is a no-op in that
 * path because vitest already populates `process.env` from its own
 * mocks before importing this module.
 */
export async function runServerMigrations(): Promise<void> {
  // Dynamic imports — see env-loader note above. Static imports would
  // hoist above loadEnvFile and env.ts would parse before
  // DATABASE_URL was in process.env.
  const { migrate: migrateNeon } = await import(
    'drizzle-orm/neon-http/migrator'
  );
  const { migrate: migratePglite } = await import(
    'drizzle-orm/pglite/migrator'
  );
  const { createServerDrizzle, selectDriverMode } = await import('./driver');

  const mode = selectDriverMode();
  const drizzle = createServerDrizzle();
  const migrationsFolder = path.join(
    process.cwd(),
    'src',
    'db',
    'migrations',
    'server',
  );
  if (mode === 'neon') {
    await migrateNeon(
      drizzle as Parameters<typeof migrateNeon>[0],
      { migrationsFolder },
    );
  } else {
    await migratePglite(
      drizzle as Parameters<typeof migratePglite>[0],
      { migrationsFolder },
    );
  }
}

// CLI entry point — works under both tsx (ESM) and a CJS runner.
const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  runServerMigrations()
    .then(() => {
      console.log('migrations applied');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
