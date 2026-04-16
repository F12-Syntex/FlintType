import { randomUUID } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import {
  aiUsage,
  type AiUsageRow,
} from '@/db/schema/server/ai-usage';
import type { ServerDrizzle } from '../driver';

export type AiUsageLogInput = {
  userId: string;
  preset: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  totalCostUsd: number | null;
};

export type AiUsageRepo = ReturnType<typeof aiUsageRepo>;

export function aiUsageRepo(db: ServerDrizzle) {
  return {
    log: async (input: AiUsageLogInput): Promise<AiUsageRow> => {
      const rows = await db
        .insert(aiUsage)
        .values({ id: randomUUID(), ...input })
        .returning();
      if (!rows[0]) throw new Error('aiUsage.log returned no rows');
      return rows[0];
    },

    listByUser: async (
      userId: string,
      opts: { limit?: number } = {},
    ): Promise<AiUsageRow[]> => {
      return db
        .select()
        .from(aiUsage)
        .where(eq(aiUsage.userId, userId))
        .orderBy(desc(aiUsage.createdAt))
        .limit(opts.limit ?? 100);
    },
  };
}
