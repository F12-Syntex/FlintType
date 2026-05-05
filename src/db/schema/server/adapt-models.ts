import {
  doublePrecision,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/** Per-user, per-bigram running statistics. The algorithm reads the
 *  full set at scoring time and bulk-upserts the deltas after each
 *  test. Welford's incremental formula tracks (mean, variance) without
 *  needing the original samples. */
export const bigramModels = pgTable(
  "bigram_models",
  {
    userId: text("user_id").notNull(),
    bigram: text("bigram").notNull(),
    meanMs: doublePrecision("mean_ms").notNull(),
    varianceMs: doublePrecision("variance_ms").notNull(),
    sampleCount: integer("sample_count").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.bigram] }),
  }),
);

/** Per-user, per-trigram running statistics. Same shape as bigrams —
 *  separate table because the algorithm scores each unit independently
 *  and a single-table union would force every read to filter. */
export const trigramModels = pgTable(
  "trigram_models",
  {
    userId: text("user_id").notNull(),
    trigram: text("trigram").notNull(),
    meanMs: doublePrecision("mean_ms").notNull(),
    varianceMs: doublePrecision("variance_ms").notNull(),
    sampleCount: integer("sample_count").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.trigram] }),
  }),
);

/** Per-user, per-motor-feature running statistics. `featureKey` is a
 *  short string derived from the user's finger map plus a bigram (e.g.
 *  "same_finger_left_pinky"). When the finger map changes, the
 *  motor-feature model is invalidated for that user — the bigram and
 *  trigram tables stay intact because they describe what was actually
 *  typed, independent of stated finger configuration. */
export const motorFeatureModels = pgTable(
  "motor_feature_models",
  {
    userId: text("user_id").notNull(),
    featureKey: text("feature_key").notNull(),
    meanMs: doublePrecision("mean_ms").notNull(),
    varianceMs: doublePrecision("variance_ms").notNull(),
    sampleCount: integer("sample_count").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: false })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.featureKey] }),
  }),
);

export type BigramModelRow = typeof bigramModels.$inferSelect;
export type NewBigramModelRow = typeof bigramModels.$inferInsert;
export type TrigramModelRow = typeof trigramModels.$inferSelect;
export type NewTrigramModelRow = typeof trigramModels.$inferInsert;
export type MotorFeatureModelRow = typeof motorFeatureModels.$inferSelect;
export type NewMotorFeatureModelRow = typeof motorFeatureModels.$inferInsert;
