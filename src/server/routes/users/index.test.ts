import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { BackendError } from '@/lib/errors';
import type { ClerkUserLike } from '@/server/clerk-user';
import { callRoute } from '@/server/testing';
import type { GetUserOutput, ListUsersOutput } from '@/types/user';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  clerkClient: vi.fn(),
}));

import { auth, clerkClient } from '@clerk/nextjs/server';

const mockAuth = vi.mocked(auth);
const mockClerkClient = vi.mocked(clerkClient);

type AuthReturn = Awaited<ReturnType<typeof auth>>;
type ClientReturn = Awaited<ReturnType<typeof clerkClient>>;

function fixtureUser(overrides: Partial<ClerkUserLike> = {}): ClerkUserLike {
  return {
    id: 'user_1',
    firstName: 'Alice',
    lastName: null,
    imageUrl: 'https://img.clerk.com/alice',
    primaryEmailAddressId: 'e1',
    emailAddresses: [{ id: 'e1', emailAddress: 'alice@example.com' }],
    publicMetadata: { role: 'admin' },
    ...overrides,
  };
}

function mockClerkUsers(users: ClerkUserLike[]) {
  mockClerkClient.mockResolvedValue({
    users: {
      getUserList: vi.fn(async () => ({
        data: users,
        totalCount: users.length,
      })),
      getUser: vi.fn(async (id: string) => {
        const found = users.find((u) => u.id === id);
        if (!found) throw new Error('Not Found');
        return found;
      }),
    },
  } as unknown as ClientReturn);
}

function asUser() {
  mockAuth.mockResolvedValue({
    userId: 'user_2',
    sessionClaims: { metadata: { role: 'user' } },
  } as unknown as AuthReturn);
}

function asAdmin() {
  mockAuth.mockResolvedValue({
    userId: 'user_1',
    sessionClaims: { metadata: { role: 'admin' } },
  } as unknown as AuthReturn);
}

function asAnon() {
  mockAuth.mockResolvedValue({
    userId: null,
    sessionClaims: null,
  } as unknown as AuthReturn);
}

beforeEach(() => {
  mockAuth.mockReset();
  mockClerkClient.mockReset();
});

describe('users.list', () => {
  it('rejects unauthenticated callers before hitting Clerk', async () => {
    asAnon();
    await expect(callRoute(['users', 'list'])).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 401 &&
        e.code === 'UNAUTHORIZED',
    );
    expect(mockClerkClient).not.toHaveBeenCalled();
  });

  it('returns Clerk users mapped to the User shape', async () => {
    asUser();
    mockClerkUsers([
      fixtureUser({ id: 'user_1', firstName: 'Alice' }),
      fixtureUser({
        id: 'user_2',
        firstName: 'Bob',
        publicMetadata: { role: 'user' },
      }),
    ]);
    const out = await callRoute<ListUsersOutput>(['users', 'list']);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      id: 'user_1',
      name: 'Alice',
      email: 'alice@example.com',
      role: 'admin',
    });
    expect(out[1].role).toBe('user');
  });
});

describe('users.get', () => {
  it('returns a user by id', async () => {
    asUser();
    mockClerkUsers([fixtureUser({ id: 'user_1', firstName: 'Alice' })]);
    const out = await callRoute<GetUserOutput>(['users', 'get'], {
      input: { id: 'user_1' },
    });
    expect(out.id).toBe('user_1');
    expect(out.role).toBe('admin');
  });

  it('throws NOT_FOUND when Clerk rejects the lookup', async () => {
    asAdmin();
    mockClerkUsers([fixtureUser({ id: 'user_1' })]);
    await expect(
      callRoute(['users', 'get'], { input: { id: 'nope' } }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 404 &&
        e.code === 'NOT_FOUND',
    );
  });

  it('rejects missing id via Zod (VALIDATION)', async () => {
    asUser();
    await expect(
      callRoute(['users', 'get'], { input: {} }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it('rejects non-string id via Zod', async () => {
    asUser();
    await expect(
      callRoute(['users', 'get'], { input: { id: 42 } }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
