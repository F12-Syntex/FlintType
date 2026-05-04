import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** One row per Clerk user. `data` is an opaque blob — the client is the
 *  source of truth for its shape (see `src/types/user-prefs.ts`). The
 *  server doesn't pretend to know what's inside; that lets us add new
 *  pref slices on the client without a migration every time. */
export const userPrefs = pgTable("user_prefs", {
  userId: text("user_id").primaryKey(),
  data: jsonb("data").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .defaultNow()
    .notNull(),
});

export type UserPrefsRow = typeof userPrefs.$inferSelect;
export type NewUserPrefsRow = typeof userPrefs.$inferInsert;
