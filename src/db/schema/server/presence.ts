import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Last-seen heartbeat per user — the "who's online" signal. One row
 *  per user, upserted every ~30s while a signed-in tab is open.
 *  "Online" is derived at read time (`lastSeenAt` within a short
 *  window), so there's no separate online flag to clean up when a tab
 *  closes without a goodbye.
 *
 *  DB-backed (not in-memory on the race authority) because presence is
 *  keyed on the *authenticated* Clerk user id, which the authority
 *  can't see — and a shared table is correct across Vercel instances.
 *  Cheap: one upsert per online user per heartbeat interval. */
export const presence = pgTable("presence", {
  /** Clerk user id. */
  userId: text("user_id").primaryKey(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
  /** Coarse activity: 'online' | 'practicing' | 'racing'. Open string
   *  so richer statuses need no migration. */
  status: text("status").notNull().default("online"),
});

export type PresenceRow = typeof presence.$inferSelect;
export type NewPresenceRow = typeof presence.$inferInsert;
