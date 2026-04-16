import { defineNamespace, defineRoute } from '@/server';
import { sayInputSchema, type SayInput, type SayOutput } from '@/types/echo';

const say = defineRoute<SayInput, SayOutput>({
  input: sayInputSchema,
  handler: ({ input }) => ({
    echoed: input.message,
    length: input.message.length,
  }),
});

export const echo = defineNamespace({
  routes: { say },
});
