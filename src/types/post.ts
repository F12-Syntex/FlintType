import { z } from 'zod';

export type { NewPost, Post } from '@/db/schema/server/posts';

export const createPostInputSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(10_000),
});

export const removePostInputSchema = z.object({
  id: z.string().min(1),
});

export type CreatePostInput = z.infer<typeof createPostInputSchema>;
export type RemovePostInput = z.infer<typeof removePostInputSchema>;

import type { Post } from '@/db/schema/server/posts';

export type CreatePostOutput = Post;
export type ListPostsOutput = Post[];
export type RemovePostOutput = { removed: boolean };
