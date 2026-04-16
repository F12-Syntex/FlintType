import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendError } from '@/lib/errors';
import { createTestDatabase } from '@/db/server/testing';
import type { ClerkUserLike } from './clerk-user';
import { logger } from './logger';
import type { RouteContext } from './types';

vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(),
}));

import { clerkClient } from '@clerk/nextjs/server';
import { ensureUser } from './ensure-user';

const mockClerkClient = vi.mocked(clerkClient);

const { db, reset, close } = await createTestDatabase();

function clerkFixture(overrides: Partial<ClerkUserLike> = {}): ClerkUserLike {
  return {
    id: 'user_1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    imageUrl: 'https://img.clerk.com/ada',
    primaryEmailAddressId: 'e1',
    emailAddresses: [{ id: 'e1', emailAddress: 'ada@example.com' }],
    publicMetadata: {},
    ...overrides,
  };
}

function mockGetUser(impl: (id: string) => Promise<ClerkUserLike>) {
  const getUser = vi.fn(impl);
  mockClerkClient.mockResolvedValue({
    users: { getUser },
  } as unknown as Awaited<ReturnType<typeof clerkClient>>);
  return getUser;
}

function ctx(meta: Record<string, unknown> = {}): RouteContext {
  return {
    input: undefined,
    req: new NextRequest('http://localhost/api/x/y', { method: 'POST' }),
    meta,
    log: logger,
    db,
  };
}

beforeEach(async () => {
  await reset();
  mockClerkClient.mockReset();
});

afterAll(async () => {
  await close();
});

describe('ensureUser', () => {
  it('returns the existing local row without calling Clerk', async () => {
    await db.users.upsertFromClerk(clerkFixture());
    const getUser = mockGetUser(async () => {
      throw new Error('should not be called');
    });
    const row = await ensureUser(ctx({ userId: 'user_1' }));
    expect(row.email).toBe('ada@example.com');
    expect(getUser).not.toHaveBeenCalled();
  });

  it('fetches from Clerk and upserts on first access', async () => {
    const getUser = mockGetUser(async () => clerkFixture({ id: 'user_2' }));
    const row = await ensureUser(ctx({ userId: 'user_2' }));
    expect(getUser).toHaveBeenCalledWith('user_2');
    expect(row.id).toBe('user_2');
    expect(await db.users.findById('user_2')).not.toBeNull();
  });

  it('throws INTERNAL when ctx.meta.userId is missing', async () => {
    await expect(ensureUser(ctx())).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 500 &&
        e.code === 'INTERNAL',
    );
  });

  it('throws NOT_FOUND when Clerk has no such user', async () => {
    mockGetUser(async () => {
      throw new Error('Not Found');
    });
    await expect(ensureUser(ctx({ userId: 'ghost' }))).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 404 &&
        e.code === 'NOT_FOUND',
    );
  });
});
