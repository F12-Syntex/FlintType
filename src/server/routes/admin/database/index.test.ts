import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { BackendError } from '@/lib/errors';
import { createTestDatabase } from '@/db/server/testing';
import { callRoute } from '@/server/testing';
import type { DatabaseHealth, TableRowsOutput } from '@/types/admin';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
}));

vi.mock('@/server/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/env')>();
  return { ...actual, env: { ...actual.env, APP_ENV: 'development' } };
});

import { auth } from '@clerk/nextjs/server';
import { env } from '@/server/env';

const mockAuth = vi.mocked(auth);
const mockEnv = env as { APP_ENV: 'development' | 'production' };

const testDb = await createTestDatabase();

afterAll(async () => {
  await testDb.close();
});

beforeEach(async () => {
  await testDb.reset();
  mockAuth.mockReset();
  mockEnv.APP_ENV = 'development';
});

afterEach(() => {
  mockEnv.APP_ENV = 'development';
});

describe('admin.database.health — dev mode', () => {
  it('returns driver + size + tables for an unauthenticated caller', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const out = await callRoute<DatabaseHealth>(['admin', 'database', 'health'], {
      db: testDb.db,
    });
    expect(out.driver).toBe('pglite');
    expect(out.databaseBytes).toBeGreaterThan(0);
    expect(out.tables.map((t) => t.name).sort()).toEqual(['ai_usage', 'posts']);
  });
});

describe('admin.database.health — production mode', () => {
  beforeEach(() => {
    mockEnv.APP_ENV = 'production';
  });

  it('rejects unauthenticated callers with UNAUTHORIZED', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(['admin', 'database', 'health'], { db: testDb.db }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 401 &&
        e.code === 'UNAUTHORIZED',
    );
  });

  it('rejects signed-in non-admins with FORBIDDEN', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_1',
      sessionClaims: { metadata: { role: 'user' } },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      callRoute(['admin', 'database', 'health'], { db: testDb.db }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 403 &&
        e.code === 'FORBIDDEN',
    );
  });

  it('lets admins through', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_admin',
      sessionClaims: { metadata: { role: 'admin' } },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    const out = await callRoute<DatabaseHealth>(
      ['admin', 'database', 'health'],
      { db: testDb.db },
    );
    expect(out.tables.length).toBeGreaterThan(0);
  });
});

describe('admin.database.rows — dev mode', () => {
  it('returns rows + columns + totalRows for a known table', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);

    await testDb.db.posts.create({
      title: 'hello',
      body: 'world',
      authorId: 'user_1',
    });
    const out = await callRoute<TableRowsOutput>(
      ['admin', 'database', 'rows'],
      { db: testDb.db, input: { table: 'posts' } },
    );
    expect(out.table).toBe('posts');
    expect(out.totalRows).toBe(1);
    expect(out.columns).toContain('title');
  });

  it('rejects an unknown table with NOT_FOUND', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);

    await expect(
      callRoute(['admin', 'database', 'rows'], {
        db: testDb.db,
        input: { table: 'does_not_exist' },
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError && e.code === 'NOT_FOUND',
    );
  });

  it('rejects a blank table name with a ZodError (dispatcher maps to VALIDATION)', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);

    await expect(
      callRoute(['admin', 'database', 'rows'], {
        db: testDb.db,
        input: { table: '' },
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
