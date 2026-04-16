import { randomUUID } from 'node:crypto';
import { and, desc, eq } from 'drizzle-orm';
import { posts } from '@/db/schema/server/posts';
import type { Post } from '@/types/post';
import type { ServerDrizzle } from '../driver';

export type PostsRepo = ReturnType<typeof postsRepo>;

export function postsRepo(db: ServerDrizzle) {
  return {
    list: async (opts: { limit?: number } = {}): Promise<Post[]> => {
      return db
        .select()
        .from(posts)
        .orderBy(desc(posts.createdAt))
        .limit(opts.limit ?? 100);
    },

    findById: async (id: string): Promise<Post | null> => {
      const rows = await db
        .select()
        .from(posts)
        .where(eq(posts.id, id))
        .limit(1);
      return rows[0] ?? null;
    },

    create: async (input: {
      title: string;
      body: string;
      authorId: string;
    }): Promise<Post> => {
      const rows = await db
        .insert(posts)
        .values({
          id: randomUUID(),
          title: input.title,
          body: input.body,
          authorId: input.authorId,
        })
        .returning();
      if (!rows[0]) throw new Error('posts.create returned no rows');
      return rows[0];
    },

    removeOwned: async (input: {
      id: string;
      authorId: string;
    }): Promise<boolean> => {
      const rows = await db
        .delete(posts)
        .where(
          and(eq(posts.id, input.id), eq(posts.authorId, input.authorId)),
        )
        .returning();
      return rows.length > 0;
    },
  };
}
