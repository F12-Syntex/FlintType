import { integer, pgTable, real, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * One row per successful AI call. Token counts are integers (OpenRouter
 * returns whole numbers); `totalCostUsd` is a float because OpenRouter
 * returns sub-cent precision. Nullable everywhere except ids/timestamps
 * because some models / routing paths don't include usage in the response.
 */
export const aiUsage = pgTable('ai_usage', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  preset: text('preset').notNull(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalTokens: integer('total_tokens'),
  totalCostUsd: real('total_cost_usd'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AiUsageRow = typeof aiUsage.$inferSelect;
export type NewAiUsageRow = typeof aiUsage.$inferInsert;
