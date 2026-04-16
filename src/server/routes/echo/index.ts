import { z } from 'zod';
import { defineNamespace, defineRoute } from '@/server';

const sayInputSchema = z.object({
  message: z.string().min(1).max(500),
});

export type SayInput = z.infer<typeof sayInputSchema>;
export type SayOutput = { echoed: string; length: number };

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
