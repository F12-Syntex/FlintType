import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** A broadcaster's latest live-practice snapshot, one row per user.
 *  Upserted ~every 700ms while they practise on the live surface (if
 *  opted in). Spectators read it; "live" is derived at read time from
 *  `updatedAt` freshness, so a broadcaster who stops just ages out.
 *
 *  DB-backed (like presence) rather than in-memory: a live session
 *  keys on the authenticated Clerk userId, and a shared table is
 *  correct across Vercel instances — a spectator poll routed to a
 *  different instance than the broadcaster's push still sees the
 *  snapshot. (The eventual SSE + single-authority upgrade — see
 *  docs/multiplayer.md — can move this back in-process.) */
export const liveSessions = pgTable("live_sessions", {
  /** Clerk user id of the broadcaster. */
  userId: text("user_id").primaryKey(),
  /** The `LiveSnapshot` (passage + cursor + wpm/accuracy). */
  snapshot: jsonb("snapshot").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: false })
    .notNull()
    .defaultNow(),
});

export type LiveSessionRow = typeof liveSessions.$inferSelect;
export type NewLiveSessionRow = typeof liveSessions.$inferInsert;
