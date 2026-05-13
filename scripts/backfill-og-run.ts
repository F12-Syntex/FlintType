/**
 * Body of the OG backfill — see scripts/backfill-og.ts for context.
 *
 * Split out so the entry script can populate process.env BEFORE these
 * imports run; ES module imports are hoisted, so any `import` in the
 * entry file would race ahead of env loading and Clerk would see an
 * empty CLERK_SECRET_KEY.
 */
import { clerkClient } from "@clerk/nextjs/server";
import { getDatabase } from "@/db/server";
import { OG_MILESTONE_LIMIT } from "@/db/server/repositories/users";
import { logger } from "@/server/logger";
import { grantOg } from "@/server/og-grant";

const PAGE_SIZE = 100;

export async function run() {
  const dryRun = process.argv.includes("--dry-run");

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
        // Drizzle wraps the driver error and the most useful detail
        // (e.g. "relation \"users\" does not exist", "column ... does
        // not exist") lives on err.cause. Surface both so the
        // operator can see why the query failed.
        const top = err instanceof Error ? err.message : String(err);
        const cause = err instanceof Error && err.cause
          ? (err.cause instanceof Error ? err.cause.message : String(err.cause))
          : null;
        const msg = cause ? `${top}  (cause: ${cause})` : top;
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
  process.exit(0);
}
