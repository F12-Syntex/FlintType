#!/usr/bin/env tsx
/**
 * Grant or revoke a user-identity tag by hand.
 *
 * Thin entry — loads .env.local + .env BEFORE importing anything that
 * reads `process.env` at module-init time (notably @clerk/nextjs/server),
 * then hands off to `grant-tag-run.ts` for the actual work. Same
 * two-file rationale as scripts/backfill-og.ts: ES `import` statements
 * are hoisted above top-level code, so a static Clerk import in this
 * file would read CLERK_SECRET_KEY before loadEnvFile() populates it; a
 * dynamic `await import(...)` after the loader sidesteps that.
 *
 * Usage:
 *   yarn grant-tag <tag> <email|userId>            # grant
 *   yarn grant-tag <tag> <email|userId> --remove   # revoke
 *   yarn grant-tag <tag> <email|userId> --dry-run  # preview, no write
 *
 * Example (the bug-finder tag):
 *   yarn grant-tag whitehat someone@example.com
 *
 * Requires CLERK_SECRET_KEY in .env.local. Touches only Clerk
 * publicMetadata — no database access needed.
 */
import { readFileSync } from "node:fs";

// Tiny .env loader — mirrors scripts/backfill-og.ts so the script can
// read CLERK_SECRET_KEY from .env.local without pulling in dotenv.
// Lines starting with `#` and empty lines are skipped; values aren't
// unquoted or expanded.
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

// Dynamic import so the Clerk SDK only initialises after env is in
// place. A static `import` would be hoisted above loadEnvFile and
// Clerk would read an empty CLERK_SECRET_KEY. Wrapped in an async IIFE
// because tsx emits CJS, which doesn't support top-level await.
void (async () => {
  try {
    const { run } = await import("./grant-tag-run");
    await run();
  } catch (err) {
    console.error("\nFatal:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
})();
