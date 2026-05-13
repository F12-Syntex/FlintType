import { eq } from "drizzle-orm";
import { users, type UserRow } from "@/db/schema/server/users";
import type { ServerDrizzle } from "../driver";

/** The signup-order threshold for the OG identity tag. The first
 *  `OG_MILESTONE_LIMIT` rows materialised in the `users` table receive
 *  the OG tag automatically via `ensureUser` + `grantOgIfEligible`.
 *  Past the threshold, no automatic grant fires — OG is permanent for
 *  early users, never extended retroactively. */
export const OG_MILESTONE_LIMIT = 1000;

/** Result of `ensureForUser`. `created=true` means this call inserted
 *  the row — the caller can read `row.seq` to decide whether a
 *  first-time side-effect (e.g. the OG grant) should fire. On
 *  `created=false` the row already existed and no grant should run. */
export type EnsureResult = {
  row: UserRow;
  created: boolean;
};

export function usersRepo(db: ServerDrizzle) {
  return {
    /** Read-only lookup by Clerk user id. Returns null when the user
     *  has never been materialised — handlers that need a row should
     *  reach for `ensureForUser` instead. */
    async findById(id: string): Promise<UserRow | null> {
      const rows = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    /** Materialise the row for `id` if it doesn't already exist.
     *
     *  Idempotent. Race-safe via `onConflictDoNothing` — two
     *  simultaneous calls land at most one INSERT; the second one
     *  re-reads the winning row and reports `created=false`.
     *
     *  Callers branch on `created`:
     *    - `true`  → first time we've seen this user. Inspect
     *                `row.seq` to decide whether a first-encounter
     *                side-effect (OG grant) should run.
     *    - `false` → row already existed. No first-time work. */
    async ensureForUser(id: string): Promise<EnsureResult> {
      const inserted = await db
        .insert(users)
        .values({ id })
        .onConflictDoNothing({ target: users.id })
        .returning();
      const fresh = inserted[0];
      if (fresh) return { row: fresh, created: true };
      // Conflict path — the row already existed. Re-read it so the
      // caller still gets a UserRow back.
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      const row = existing[0];
      if (!row) throw new Error(`users.ensureForUser: row vanished for ${id}`);
      return { row, created: false };
    },

    /** Total materialised users — used in tests and admin surfaces.
     *  Indexed scan over the table; cheap for the row counts a typing
     *  product will see. */
    async count(): Promise<number> {
      const rows = await db.select({ id: users.id }).from(users);
      return rows.length;
    },
  };
}

export type UsersRepo = ReturnType<typeof usersRepo>;
