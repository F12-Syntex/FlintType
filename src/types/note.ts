import { z } from 'zod';

export type { NewNote, Note } from '@/db/schema/notes';

export const createNoteInputSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
});

export type CreateNoteInput = z.infer<typeof createNoteInputSchema>;
