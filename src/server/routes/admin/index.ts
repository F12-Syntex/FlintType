import { clerkClient } from "@clerk/nextjs/server";
import { defineNamespace, defineRoute } from "@/server";
import { BackendError } from "@/lib/errors";
import { OG_MILESTONE_LIMIT } from "@/db/server/repositories/users";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/middleware/rate-limit";
import { grantOg } from "@/server/og-grant";
import { isOwnerEmail } from "@/server/owner-config";

export type BackfillOgOutput = {
  /** Number of Clerk users walked. */
  scanned: number;
  /** Newly-granted OG users in this run. */
  granted: number;
  /** Users who already had `og_granted_at` set (no-op). */
  alreadyGranted: number;
  /** Users whose seq is past the milestone — too late to grant. */
  pastMilestone: number;
  /** Users whose per-row processing threw (e.g. missing migration,
   *  Clerk write failure). Counted but not propagated as 500 — so a
   *  single bad row doesn't black-hole the whole batch. */
  errors: number;
  /** First per-user error message, surfaced so the caller can debug
   *  without grepping server logs. Null when no errors. */
  firstError: string | null;
};

/** One-shot owner-only route that walks every Clerk user oldest-first
 *  and grants OG to anyone eligible (seq within `OG_MILESTONE_LIMIT`)
 *  whose grant flag is still null.
 *
 *  Designed for the "give all existing users OG instantly" flow — the
 *  lazy-grant path inside `ensureUser` only fires when a user visits,
 *  which leaves dormant accounts un-tagged. This route is the explicit
 *  push: triggered once by the owner, it materialises mirror rows for
 *  every Clerk user, runs `grantOg` per row, and stamps
 *  `og_granted_at` so subsequent visits skip the work.
 *
 *  Authorisation: same OWNER_EMAILS allowlist that defines the OWNER
 *  tag. Keeping this in lockstep means anyone who's an OWNER can
 *  trigger admin actions without a separate Clerk metadata role
 *  needing to be set up.
 *
 *  Idempotent — re-runs only scan and report. Already-granted users
 *  are skipped without re-hitting Clerk. */
const backfillOg = defineRoute<void, BackfillOgOutput>({
  middleware: [requireAuth, rateLimit({ limit: 5, windowMs: 60_000 })],
  handler: async ({ db, meta, log }) => {
    const callerId = meta.userId as string;
    const client = await clerkClient();
    // Owner check first — fail fast with a specific message before
    // touching the mirror table or Clerk pagination.
    let me;
    try {
      me = await client.users.getUser(callerId);
    } catch (err) {
      log.error("admin.backfillOg: clerk getUser(caller) failed", err);
      throw new BackendError(
        500,
        "INTERNAL",
        `Couldn't read your Clerk profile: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const callerEmail = me.emailAddresses[0]?.emailAddress;
    if (!isOwnerEmail(callerEmail)) {
      throw new BackendError(403, "FORBIDDEN", "owner only");
    }

    let scanned = 0;
    let granted = 0;
    let alreadyGranted = 0;
    let pastMilestone = 0;
    let errors = 0;
    let firstError: string | null = null;
    const captureError = (where: string, err: unknown, userId?: string) => {
      errors += 1;
      const msg = err instanceof Error ? err.message : String(err);
      if (firstError == null) firstError = `${where}: ${msg}`;
      log.warn("admin.backfillOg per-user failure", { where, userId, error: msg });
    };

    // Paginate Clerk's user list. 100 is the per-page max. Order by
    // ascending created_at so the SERIAL seq we assign in
    // ensureForUser matches signup-order as closely as possible for
    // users who don't yet have mirror rows.
    const PAGE_SIZE = 100;
    let offset = 0;
    // Hard ceiling on iteration count so a misbehaving Clerk page
    // doesn't spin the handler forever. We're way past the
    // OG_MILESTONE_LIMIT after this many users anyway.
    const MAX_PAGES = 50;
    for (let pageNum = 0; pageNum < MAX_PAGES; pageNum += 1) {
      let users;
      try {
        const page = await client.users.getUserList({
          limit: PAGE_SIZE,
          offset,
          orderBy: "+created_at",
        });
        users = page.data;
      } catch (err) {
        log.error("admin.backfillOg: clerk getUserList failed", err, {
          offset,
        });
        throw new BackendError(
          500,
          "INTERNAL",
          `Clerk getUserList failed at offset ${offset}: ${err instanceof Error ? err.message : String(err)}`,
        );
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
          await grantOg({ db, log }, u.id, row.seq);
          await db.users.markOgGranted(u.id);
          granted += 1;
        } catch (err) {
          // Single-row failure (missing migration, Clerk write hiccup,
          // notification insert collision) — log + continue so one
          // bad row doesn't blackhole the whole batch.
          captureError("per-user", err, u.id);
        }
      }
      offset += users.length;
      if (users.length < PAGE_SIZE) break;
    }

    // If every scanned user failed identically, the most likely
    // cause is a missing migration on prod (users table or its
    // og_granted_at column). Surface that explicitly so the caller
    // isn't staring at a silent "0 granted" result.
    if (scanned > 0 && errors === scanned) {
      throw new BackendError(
        500,
        "INTERNAL",
        `All ${scanned} users failed (${firstError ?? "unknown error"}). Verify migrations 0004 (users) and 0005 (og_granted_at) are applied on prod — run \`yarn db:migrate\` against DATABASE_URL.`,
      );
    }

    log.info("admin.backfillOg complete", {
      scanned,
      granted,
      alreadyGranted,
      pastMilestone,
      errors,
    });
    return {
      scanned,
      granted,
      alreadyGranted,
      pastMilestone,
      errors,
      firstError,
    };
  },
});

export const admin = defineNamespace({
  routes: { backfillOg },
});
