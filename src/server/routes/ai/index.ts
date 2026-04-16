import { defineNamespace, defineRoute } from '@/server';
import { generateChat } from '@/server/ai';
import { requireAuth } from '@/server/middleware/auth';
import { chatInputSchema, type ChatInput, type ChatOutput } from '@/types/ai';

const chat = defineRoute<ChatInput, ChatOutput>({
  input: chatInputSchema,
  handler: async ({ input, db, meta, log }) => {
    const userId = meta.userId as string;
    const result = await generateChat({
      preset: input.preset,
      prompt: input.prompt,
    });
    await db.aiUsage.log({
      userId,
      preset: result.preset,
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalTokens: result.usage.totalTokens,
      totalCostUsd: result.usage.totalCostUsd,
    });
    log.debug('ai.chat completed', {
      preset: result.preset,
      model: result.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
      totalCostUsd: result.usage.totalCostUsd,
    });
    return result;
  },
});

export const ai = defineNamespace({
  middleware: [requireAuth],
  routes: { chat },
});
