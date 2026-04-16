import { BackendError, defineNamespace, defineRoute } from '@/server';
import { requireAuth } from '@/server/middleware/auth';
import {
  createPostInputSchema,
  removePostInputSchema,
  type CreatePostInput,
  type CreatePostOutput,
  type ListPostsOutput,
  type RemovePostInput,
  type RemovePostOutput,
} from '@/types/post';

const list = defineRoute<void, ListPostsOutput>({
  handler: async ({ db, log }) => {
    const out = await db.posts.list({ limit: 100 });
    log.debug('posts fetched', { count: out.length });
    return out;
  },
});

const create = defineRoute<CreatePostInput, CreatePostOutput>({
  input: createPostInputSchema,
  middleware: [requireAuth],
  handler: async ({ input, db, meta }) => {
    const authorId = meta.userId as string;
    return db.posts.create({
      title: input.title,
      body: input.body,
      authorId,
    });
  },
});

const remove = defineRoute<RemovePostInput, RemovePostOutput>({
  input: removePostInputSchema,
  middleware: [requireAuth],
  handler: async ({ input, db, meta }) => {
    const authorId = meta.userId as string;
    const existing = await db.posts.findById(input.id);
    if (!existing) {
      throw new BackendError(404, 'NOT_FOUND', `post ${input.id} not found`);
    }
    if (existing.authorId !== authorId) {
      throw new BackendError(403, 'FORBIDDEN', 'only the author can remove');
    }
    const removed = await db.posts.removeOwned({
      id: input.id,
      authorId,
    });
    return { removed };
  },
});

export const posts = defineNamespace({
  routes: { list, create, remove },
});
