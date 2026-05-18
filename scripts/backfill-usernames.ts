#!/usr/bin/env tsx
/**
 * Backfill clean, unique Clerk usernames for every existing user.
 *
 * Why: pre-this-fix the /profile redirect fell back to the email
 * local-part as a slug, generating unresolvable URLs like
 * /profile/eng.saifkhan2003. The new auto-assign rule (see
 * src/server/auto-username.ts) only fires when a user visits their
 * own /profile — this script does the same assignment for everyone
 * up front, ordered by Clerk createdAt (oldest signups win the
 * cleanest name on collision).
 *
 * For each user who gets a name assigned, a `username_assigned`
 * notification is created so the user knows their profile URL
 * landed on @<name>. Users who already had a Clerk username are
 * left untouched.
 *
 * Usage:
 *   yarn backfill-usernames               # apply changes
 *   yarn backfill-usernames --dry-run     # report counts, no writes
 *
 * Requires CLERK_SECRET_KEY + DATABASE_URL in .env.local. Run against
 * production by symlinking / copying .env.production.local → .env.local
 * for the duration of the run; the loader below reads .env.local first.
 *
 * Thin entry; see backfill-usernames-run.ts for the actual work — the
 * split exists so this file can populate process.env BEFORE any
 * `import` from @clerk/nextjs/server runs (ES module imports hoist
 * above top-level code, so doing both in one file races the env
 * loader against Clerk's SDK init).
 */
import { readFileSync } from "node:fs";

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

void (async () => {
  try {
    const { run } = await import("./backfill-usernames-run");
    await run();
  } catch (err) {
    console.error("\nFatal:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
})();
