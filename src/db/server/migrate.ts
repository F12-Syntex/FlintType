import path from 'node:path';
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { createServerDrizzle, selectDriverMode } from './driver';

/**
 * Runs pending migrations against whichever driver is selected. Idempotent.
 * Called by the `yarn db:migrate` script and by tests.
 */
export async function runServerMigrations(): Promise<void> {
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

if (require.main === module) {
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
