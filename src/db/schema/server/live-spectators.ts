import { pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

/** Who is currently watching whom. One row per (broadcaster, spectator)
 *  pair, refreshed every time a spectator polls `live.watch` and the
 *  session is live. "Currently spectating" is derived at read time from
 *  `updatedAt` freshness (a spectator that stopped polling ages out), so
 *  the broadcaster's "N people are spectating" readout needs no goodbye.
 *
 *  DB-backed like presence + live_sessions: the broadcaster's push and a
 *  spectator's poll can land on different Vercel instances, so a shared
 *  table is the only correct place to count watchers. Same no-FK mirror
 *  convention as the rest of the friends graph. */
export const liveSpectators = pgTable(
  "live_spectators",
  {
    broadcasterId: text("broadcaster_id").notNull(),
    spectatorId: text("spectator_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.broadcasterId, t.spectatorId] }),
  }),
);

export type LiveSpectatorRow = typeof liveSpectators.$inferSelect;
export type NewLiveSpectatorRow = typeof liveSpectators.$inferInsert;
