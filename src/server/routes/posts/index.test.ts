import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { BackendError } from '@/lib/errors';
import { createTestDatabase } from '@/db/server/testing';
import { callRoute } from '@/server/testing';
import type {
  CreatePostOutput,
  ListPostsOutput,
  RemovePostOutput,
} from '@/types/post';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
}));

import { auth } from '@clerk/nextjs/server';

const mockAuth = vi.mocked(auth);
type AuthReturn = Awaited<ReturnType<typeof auth>>;

function asUser(userId = 'user_1') {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: null,
  } as unknown as AuthReturn);
}

function asAnon() {
  mockAuth.mockResolvedValue({
    userId: null,
    sessionClaims: null,
  } as unknown as AuthReturn);
}

const { db, reset, close } = await createTestDatabase();

beforeEach(async () => {
  mockAuth.mockReset();
  await reset();
});

afterAll(async () => {
  await close();
});

describe('posts.list', () => {
  it('is public — no auth required', async () => {
    asAnon();
    await db.posts.create({
      title: 'Hello',
      body: 'world',
      authorId: 'user_1',
    });
    const out = await callRoute<ListPostsOutput>(['posts', 'list'], { db });
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe('Hello');
  });
});

describe('posts.create', () => {
  it('rejects unauthenticated callers', async () => {
    asAnon();
    await expect(
      callRoute(['posts', 'create'], {
        db,
        input: { title: 'T', body: 'B' },
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError && e.code === 'UNAUTHORIZED',
    );
  });

  it('creates a post with authorId from the Clerk session', async () => {
    asUser('user_42');
    const out = await callRoute<CreatePostOutput>(['posts', 'create'], {
      db,
      input: { title: 'T', body: 'B' },
    });
    expect(out.authorId).toBe('user_42');
    expect(out.title).toBe('T');
  });

  it('rejects bad input via Zod', async () => {
    asUser();
    await expect(
      callRoute(['posts', 'create'], { db, input: { title: '' } }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});

describe('posts.remove', () => {
  it('rejects unauthenticated callers', async () => {
    asAnon();
    await expect(
      callRoute(['posts', 'remove'], { db, input: { id: 'x' } }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError && e.code === 'UNAUTHORIZED',
    );
  });

  it('throws NOT_FOUND when the post does not exist', async () => {
    asUser('user_1');
    await expect(
      callRoute(['posts', 'remove'], { db, input: { id: 'ghost' } }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError && e.code === 'NOT_FOUND',
    );
  });

  it('throws FORBIDDEN when the caller is not the author', async () => {
    asUser('user_2');
    const post = await db.posts.create({
      title: 'T',
      body: 'B',
      authorId: 'user_1',
    });
    await expect(
      callRoute(['posts', 'remove'], { db, input: { id: post.id } }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError && e.code === 'FORBIDDEN',
    );
  });

  it('removes a post owned by the caller', async () => {
    asUser('user_1');
    const post = await db.posts.create({
      title: 'T',
      body: 'B',
      authorId: 'user_1',
    });
    const out = await callRoute<RemovePostOutput>(['posts', 'remove'], {
      db,
      input: { id: post.id },
    });
    expect(out.removed).toBe(true);
    expect(await db.posts.findById(post.id)).toBeNull();
  });
});
