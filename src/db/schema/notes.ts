import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Client-side table. Lives in the user's browser (PGlite + OPFS/IDB).
 * Never synced to a server — per-device, per-user.
 */
export const notes = pgTable('notes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
