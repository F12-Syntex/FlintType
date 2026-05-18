/**
 * Body of the username backfill — see scripts/backfill-usernames.ts.
 *
 * Iterates every Clerk user oldest-first. For each user with no
 * `username` set:
 *   1. Derive a candidate (deriveUsernameCandidate from email →
 *      name → userId).
 *   2. Try writeUser with that candidate; on collision (taken),
 *      retry with `_2`, `_3`, … until acceptance or retry exhaustion.
 *   3. Track every assigned name in an in-memory set during this
 *      run so two users in the same page with the same email
 *      local-part don't both reach for the same base candidate.
 *      Older user (earlier in the loop, lower createdAt) wins the
 *      base; newer gets the `_2` suffix without paying for a Clerk
 *      rejection round-trip.
 *   4. Create a `username_assigned` notification so the renamed
 *      user sees the change in their bell tray.
 *
 * Idempotent: re-running skips users who already have a username
 * (zero writes for them). Safe to interrupt + resume — every
 * write is per-user, no cross-user transaction.
 */
import { clerkClient } from "@clerk/nextjs/server";
import { getDatabase } from "@/db/server";
import { deriveUsernameCandidate } from "@/server/auto-username";
import { logger } from "@/server/logger";

const PAGE_SIZE = 100;
const MAX_COLLISION_RETRIES = 50;

/** Best-effort try sequence: candidate, candidate_2, …, candidate_N.
 *  Clerk's username constraint is the authority — we don't pre-query
 *  for "is this taken?" since that would be a round-trip per check.
 *  Just attempt the write and on failure move on. */
function buildCandidateSequence(base: string): string[] {
  const out: string[] = [base];
  for (let suffix = 2; suffix <= MAX_COLLISION_RETRIES; suffix++) {
    const tail = `_${suffix}`;
    const trimmed = base.slice(0, Math.max(1, 30 - tail.length));
    out.push(`${trimmed}${tail}`);
  }
  return out;
}

export async function run() {
  const dryRun = process.argv.includes("--dry-run");

  const db = getDatabase();
  const client = await clerkClient();

  let scanned = 0;
  let alreadyHadUsername = 0;
  let assigned = 0;
  let assignedFailed = 0;
  let notified = 0;
  const claimed = new Set<string>(); // case-insensitive lowercased
  const errors: string[] = [];

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

      if (u.username && u.username.length > 0) {
        alreadyHadUsername += 1;
        claimed.add(u.username.toLowerCase());
        continue;
      }

      const base = deriveUsernameCandidate({
        email: u.emailAddresses[0]?.emailAddress,
        firstName: u.firstName,
        lastName: u.lastName,
        userId: u.id,
      });

      // Build the local sequence; skip any name we've already
      // claimed in this run (oldest-user-first ordering means the
      // earlier loop iteration already took the base).
      const sequence = buildCandidateSequence(base).filter(
        (name) => !claimed.has(name.toLowerCase()),
      );

      if (dryRun) {
        const willPick = sequence[0] ?? base;
        console.log(`  [dry] ${u.id} ${u.emailAddresses[0]?.emailAddress ?? ""} → ${willPick}`);
        claimed.add(willPick.toLowerCase());
        assigned += 1;
        continue;
      }

      let picked: string | null = null;
      for (const candidate of sequence) {
        try {
          const updated = await client.users.updateUser(u.id, {
            username: candidate,
          });
          picked = updated.username ?? candidate;
          break;
        } catch {
          // Clerk rejected (most likely the username is taken,
          // possibly across-org via a Clerk row we didn't see in
          // this run, or another in-flight write). Try the next.
          continue;
        }
      }

      if (!picked) {
        assignedFailed += 1;
        errors.push(`${u.id}: exhausted retries from base "${base}"`);
        console.warn(`  failed: ${u.id} (base "${base}" — every candidate rejected)`);
        continue;
      }

      assigned += 1;
      claimed.add(picked.toLowerCase());
      logger.info("backfill-usernames: assigned", {
        userId: u.id,
        username: picked,
      });

      // Notify the user so they know their share URL landed on
      // @<picked>. Unconditional create (no dedupe) since this is a
      // one-shot operation and a re-run with --dry-run wouldn't
      // reach this path; multiple genuine assigns would be a bug
      // worth seeing in the bell tray.
      try {
        await db.notifications.create({
          userId: u.id,
          kind: "username_assigned",
          title: "Your flinttype username is set",
          body: `We assigned @${picked} as your unique handle so your profile share link is clean: /profile/${picked}. You can change it any time from your account settings.`,
          data: { username: picked },
        });
        notified += 1;
      } catch (err) {
        // Notification failure shouldn't roll back the username —
        // the rename already shipped to Clerk. Log and continue.
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${u.id}: notification create failed (${msg})`);
        console.warn(`  notify failed: ${u.id}: ${msg}`);
      }

      if (assigned % 10 === 0) {
        process.stdout.write(`  assigned ${assigned} so far…\n`);
      }
    }

    offset += users.length;
    if (users.length < PAGE_SIZE) break;
  }

  const summary = {
    dryRun,
    scanned,
    alreadyHadUsername,
    assigned,
    assignedFailed,
    notified,
    errorCount: errors.length,
  };
  console.log("\n" + JSON.stringify(summary, null, 2));
  if (errors.length > 0) {
    console.log("\nFirst few errors:");
    for (const m of errors.slice(0, 10)) console.log(`  - ${m}`);
  }
  if (dryRun && assigned > 0) {
    console.log(
      `\n${assigned} users would receive a username. Re-run without --dry-run to commit.`,
    );
  }
  process.exit(0);
}
