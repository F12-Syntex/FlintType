'use client';

import { desc, eq } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/db/schema';
import { notes } from '@/db/schema/notes';
import type { Note } from '@/types/note';

export type ClientDrizzle = ReturnType<typeof drizzle<typeof schema>>;
export type NotesClientRepo = ReturnType<typeof notesClientRepo>;

export function notesClientRepo(db: ClientDrizzle) {
  return {
    list: async (): Promise<Note[]> => {
      return db.select().from(notes).orderBy(desc(notes.createdAt));
    },

    create: async (input: { title: string; body: string }): Promise<Note> => {
      const id = crypto.randomUUID();
      const rows = await db
        .insert(notes)
        .values({ id, title: input.title, body: input.body })
        .returning();
      if (!rows[0]) throw new Error('notes.create returned no rows');
      return rows[0];
    },

    remove: async (id: string): Promise<boolean> => {
      const rows = await db
        .delete(notes)
        .where(eq(notes.id, id))
        .returning({ id: notes.id });
      return rows.length > 0;
    },
  };
}
