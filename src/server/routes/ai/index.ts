import { defineNamespace, defineRoute } from '@/server';
import { generateChat } from '@/server/ai';
import { requireAuth } from '@/server/middleware/auth';
import { chatInputSchema, type ChatInput, type ChatOutput } from '@/types/ai';

const chat = defineRoute<ChatInput, ChatOutput>({
  input: chatInputSchema,
  handler: async ({ input, log }) => {
    const result = await generateChat({
      preset: input.preset,
      prompt: input.prompt,
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
