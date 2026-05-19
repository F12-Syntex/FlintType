import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** In-app notification feed per user. Two kinds today (`announcement`
 *  + `personal_best`), more later — the `kind` field is open so new
 *  kinds don't need a migration. `data` is the kind-specific payload
 *  (e.g. `{ wpm, prevWpm, mode, durationOrWordCount }` for a PB) so
 *  the renderer can show a richer row than the title/body alone.
 *
 *  `readAt` doubles as both timestamp and read-state — null means
 *  unread. We never delete rows; the cap on `list` keeps the table
 *  from growing unbounded in practice. */
export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    /** Open string union: 'announcement' | 'personal_best' | …
     *  See `NotificationKind` in src/types/notification.ts for the
     *  canonical list the UI knows how to render. */
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    /** Kind-specific payload. The renderer narrows on `kind` and
     *  pulls expected fields out. Schemaless on purpose — adding a
     *  new kind only needs a new TypeScript discriminated union
     *  member, no migration. */
    data: jsonb("data"),
    createdAt: timestamp("created_at", { withTimezone: false })
      .notNull()
      .defaultNow(),
    /** Null while unread; set to the moment the user (or
     *  mark-all-read) acknowledges the row. */
    readAt: timestamp("read_at", { withTimezone: false }),
  },
  (t) => ({
    // Newest-first reads scoped to one user — the only index pattern
    // the list / unread-count queries need.
    userTimeIdx: index("notifications_user_time_idx").on(
      t.userId,
      t.createdAt,
    ),
    // Partial unique index on the dedupe key. Lets `createIfAbsent`
    // rely on the database for idempotency instead of the racy
    // SELECT-then-INSERT pattern: concurrent writers will collide
    // here and the second writer's ON CONFLICT DO NOTHING absorbs
    // the duplicate. Partial (only rows that actually carry the
    // __dedupe field) so non-dedupable inserts don't unique-check.
    dedupeUidx: uniqueIndex("notifications_dedupe_uidx")
      .on(t.userId, t.kind, sql`(${t.data} ->> '__dedupe')`)
      .where(sql`${t.data} ? '__dedupe'`),
  }),
);

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;
