import { defineNamespace, defineRoute } from '@/server';
import { sayInputSchema, type SayInput, type SayOutput } from '@/types/echo';

export const echo = defineNamespace({
  routes: {
    say: defineRoute<SayInput, SayOutput>({
      input: sayInputSchema,
      handler: ({ input }) => ({
        echoed: input.message,
        length: input.message.length,
      }),
    }),
  },
});
