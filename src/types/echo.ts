import { z } from 'zod';

export const sayInputSchema = z.object({
  message: z.string().min(1).max(500),
});

export type SayInput = z.infer<typeof sayInputSchema>;

export type SayOutput = {
  echoed: string;
  length: number;
};
