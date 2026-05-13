import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/** One row per Clerk user, materialised on the user's first
 *  authenticated request via `ensureUser(ctx)` (src/server/ensure-user.ts).
 *
 *  Today the mirror exists for a single reason — **monotonic signup
 *  order**. `seq` is a SERIAL column so the first user to hit the
 *  backend gets seq=1, the second seq=2, …; once a row exists the seq
 *  is permanent. The OG-tag grant uses `seq <= OG_MILESTONE_LIMIT` to
 *  decide who counts as a founding member.
 *
 *  We deliberately do **not** mirror email / name / role here yet —
 *  those still live on Clerk and are read on-demand via `clerkClient`.
 *  When a later phase needs SQL joins on those fields, add columns
 *  and an upsertFromClerk path; the row is already keyed on the Clerk
 *  userId so the migration is additive. */
export const users = pgTable("users", {
  /** Clerk user id (`user_…`). Primary key — Clerk owns identity. */
  id: text("id").primaryKey(),
  /** Monotonic signup-order counter. Auto-assigned on insert, unique
   *  across the table. `OG_MILESTONE_LIMIT` (1000) reads this to grant
   *  the OG tag to early users. */
  seq: serial("seq").notNull(),
  createdAt: timestamp("created_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
