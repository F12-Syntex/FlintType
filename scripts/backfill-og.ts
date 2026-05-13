#!/usr/bin/env tsx
/**
 * Backfill the OG identity tag for every Clerk user, oldest-first.
 *
 * Walks the Clerk user list page-by-page, materialises a local
 * mirror row for each user via `users.ensureForUser`, runs the
 * existing `grantOg` pipeline (Clerk publicMetadata write +
 * `og_granted` notification) for anyone eligible (seq within
 * `OG_MILESTONE_LIMIT` AND `og_granted_at == null`), and stamps
 * the flag so subsequent visits skip the work.
 *
 * Idempotent — re-runs skip already-granted users without re-hitting
 * Clerk. Use `--dry-run` to see the counts a real run would produce
 * without writing anything.
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
loadEnvFile(".env.local");
loadEnvFile(".env");

// Late imports so .env loading takes effect before any module reads
// process.env at import time.
import { clerkClient } from "@clerk/nextjs/server";
import { getDatabase } from "@/db/server";
import { OG_MILESTONE_LIMIT } from "@/db/server/repositories/users";
import { logger } from "@/server/logger";
import { grantOg } from "@/server/og-grant";

const PAGE_SIZE = 100;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
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

  const db = getDatabase();
  const client = await clerkClient();

  let scanned = 0;
  let granted = 0;
  let alreadyGranted = 0;
  let pastMilestone = 0;
  let errors = 0;
  const errorMessages: string[] = [];

  let offset = 0;
  while (true) {
    let users;
    try {
      const page = await client.users.getUserList({
        limit: PAGE_SIZE,
        offset,
        orderBy: "+created_at",
      });
      users = page.data;
    } catch (err) {
      console.error(
        `Clerk getUserList failed at offset ${offset}:`,
        err instanceof Error ? err.message : err,
      );
      process.exit(1);
    }
    if (users.length === 0) break;

    for (const u of users) {
      scanned += 1;
      try {
        const { row } = await db.users.ensureForUser(u.id);
        if (row.seq > OG_MILESTONE_LIMIT) {
          pastMilestone += 1;
          continue;
        }
        if (row.ogGrantedAt != null) {
          alreadyGranted += 1;
          continue;
        }
        if (dryRun) {
          granted += 1;
          continue;
        }
        await grantOg({ db, log: logger }, u.id, row.seq);
        await db.users.markOgGranted(u.id);
        granted += 1;
        // Lightweight progress signal so the operator knows the
        // script is moving — Clerk pagination + per-user Clerk writes
        // can take a few seconds per page on big rosters.
        if (granted % 10 === 0) {
          process.stdout.write(`  granted ${granted} so far…\n`);
        }
      } catch (err) {
        errors += 1;
        const msg = err instanceof Error ? err.message : String(err);
        errorMessages.push(`${u.id}: ${msg}`);
        console.warn(`  failure for ${u.id}: ${msg}`);
      }
    }

    offset += users.length;
    if (users.length < PAGE_SIZE) break;
  }

  const summary = {
    dryRun,
    scanned,
    granted,
    alreadyGranted,
    pastMilestone,
    errors,
    cap: OG_MILESTONE_LIMIT,
  };
  console.log("\n" + JSON.stringify(summary, null, 2));
  if (errors > 0) {
    console.log("\nFirst few errors:");
    for (const m of errorMessages.slice(0, 5)) console.log(`  - ${m}`);
  }
  if (dryRun && granted > 0) {
    console.log(
      `\n${granted} users would receive OG. Re-run without --dry-run to commit.`,
    );
  }
}

main()
  .catch((err) => {
    console.error("\nFatal:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .then(() => process.exit(0));
