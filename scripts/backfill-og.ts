#!/usr/bin/env tsx
/**
 * Backfill the OG identity tag for every Clerk user, oldest-first.
 *
 * Thin entry — loads .env.local + .env BEFORE importing anything that
 * reads `process.env` at module-init time (notably @clerk/nextjs/server),
 * then hands off to `backfill-og-run.ts` for the actual work.
 *
 * Why two files: ES module `import` statements are hoisted above any
 * top-level code in the same file, so doing `loadEnvFile()` + then
 * `import { clerkClient } from "@clerk/nextjs/server"` in one file
 * runs the Clerk import first and Clerk reads CLERK_SECRET_KEY before
 * it's been populated. A dynamic `await import(...)` after the loader
 * sidesteps that.
 *
 * Usage:
 *   yarn backfill-og               # grant for everyone with seq <= OG_MILESTONE_LIMIT
 *   yarn backfill-og --dry-run     # report counts, no writes
 *
 * Requires CLERK_SECRET_KEY + DATABASE_URL in .env.local. Migrations
 * 0004 (users) and 0005 (og_granted_at) must already be applied on
 * the target database — run `yarn db:migrate` first.
 */
import { readFileSync } from "node:fs";

// Tiny .env loader — mirrors scripts/send-announcement.ts so the
// script can read CLERK_SECRET_KEY + DATABASE_URL from .env.local
// without pulling in dotenv. Lines starting with `#` and empty lines
// are skipped; values aren't unquoted or expanded.
function loadEnvFile(path: string) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    /* file missing — fine, env may already be in the shell */
  }
}
// Order matters: .env.local first so its secrets win over the
// committed .env defaults.
loadEnvFile(".env.local");
loadEnvFile(".env");

if (!process.env.CLERK_SECRET_KEY) {
  console.error(
    "CLERK_SECRET_KEY missing — add it to .env.local before running this script.",
  );
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL missing — add it to .env.local before running this script.",
  );
  process.exit(1);
}

// Dynamic import so the Clerk SDK only initialises after env is in
// place. A static `import` would be hoisted above loadEnvFile and
// Clerk would read an empty CLERK_SECRET_KEY.
// Wrapped in an async IIFE because tsx emits CJS, which doesn't
// support top-level await.
void (async () => {
  try {
    const { run } = await import("./backfill-og-run");
    await run();
  } catch (err) {
    console.error("\nFatal:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
})();
