import { defineNamespace, defineRoute } from '@/server';
import { rateLimit } from '@/server/middleware/rate-limit';
import { sayInputSchema, type SayInput, type SayOutput } from '@/types/echo';

const say = defineRoute<SayInput, SayOutput>({
  input: sayInputSchema,
  middleware: [rateLimit({ limit: 30, windowMs: 60_000 })],
  handler: ({ input }) => ({
    echoed: input.message,
    length: input.message.length,
  }),
});

export const echo = defineNamespace({
  routes: { say },
});
