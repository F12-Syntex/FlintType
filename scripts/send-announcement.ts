#!/usr/bin/env tsx
/**
 * Send an announcement notification to one user, or to every user that
 * already has at least one row in the database (a cheap stand-in for
 * "broadcast to all known users" without maintaining a separate
 * users-table list).
 *
 * Usage:
 *   yarn tsx scripts/send-announcement.ts <userId|all> "<title>" "<body>" [href]
 *
 * Examples:
 *   yarn tsx scripts/send-announcement.ts user_2abc "New drill" "Worst-words is now live." /drills
 *   yarn tsx scripts/send-announcement.ts all "Heads up" "We're migrating the DB this Friday."
 *
 * Requires DATABASE_URL in .env.local (or DATABASE_MODE=pglite for a
 * local PGlite-Node run). Hits the same Drizzle layer the routes use.
 */
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";

// Tiny .env loader — no external dependency. Reads .env.local first
// (where DATABASE_URL lives) and falls back to .env for public values
// (APP_ENV / DATABASE_MODE / etc). Lines starting with `#` and empty
// lines are skipped. Values aren't unquoted or expanded — keep your
// .env files plain `KEY=value` for this script.
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

import { getDatabase } from "@/db/server";

async function main() {
  const [target, title, body, href] = process.argv.slice(2);
  if (!target || !title || !body) {
    console.error(
      "Usage: yarn tsx scripts/send-announcement.ts <userId|all> <title> <body> [href]",
    );
    process.exit(1);
  }

  const db = getDatabase();
  const data = href ? { href } : null;

  if (target === "all") {
    // Broadcast: any user the DB has ever seen (tests rows, prefs,
    // models, …). We union the userIds across the tables that have
    // them, which is good enough for an "all known users" feel
    // without dragging Clerk into a CLI script.
    const rows = await db.$drizzle.execute<{ user_id: string }>(sql`
      SELECT user_id FROM tests
      UNION SELECT user_id FROM user_prefs
      UNION SELECT user_id FROM bigram_models
    `);
    const ids = new Set<string>();
    for (const r of rows.rows as unknown as Array<{ user_id: string }>) {
      if (r.user_id) ids.add(r.user_id);
    }
    if (ids.size === 0) {
      console.log("No known users — nothing to send.");
      return;
    }
    let sent = 0;
    for (const userId of ids) {
      await db.notifications.create({
        userId,
        kind: "announcement",
        title,
        body,
        data,
      });
      sent += 1;
    }
    console.log(`Sent announcement to ${sent} user(s).`);
    return;
  }

  await db.notifications.create({
    userId: target,
    kind: "announcement",
    title,
    body,
    data,
  });
  console.log(`Sent announcement to ${target}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
