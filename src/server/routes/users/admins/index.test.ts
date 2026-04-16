import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendError } from '@/lib/errors';
import type { ClerkUserLike } from '@/server/clerk-user';
import { callRoute } from '@/server/testing';
import type { ListAdminsOutput } from '@/types/user';

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

beforeEach(() => {
  mockAuth.mockReset();
  mockClerkClient.mockReset();
});

describe('users.admins.list', () => {
  it('returns only users whose publicMetadata.role === "admin"', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_1',
      sessionClaims: { metadata: { role: 'admin' } },
    } as unknown as AuthReturn);
    mockClerkUsers([
      fixtureUser({ id: 'user_1', publicMetadata: { role: 'admin' } }),
      fixtureUser({ id: 'user_2', publicMetadata: { role: 'user' } }),
      fixtureUser({ id: 'user_3', publicMetadata: { role: 'admin' } }),
    ]);
    const out = await callRoute<ListAdminsOutput>([
      'users',
      'admins',
      'list',
    ]);
    expect(out).toHaveLength(2);
    expect(out.every((u) => u.role === 'admin')).toBe(true);
  });

  it('rejects non-admin callers with FORBIDDEN', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_2',
      sessionClaims: { metadata: { role: 'user' } },
    } as unknown as AuthReturn);
    await expect(
      callRoute(['users', 'admins', 'list']),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 403 &&
        e.code === 'FORBIDDEN',
    );
    expect(mockClerkClient).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated callers with UNAUTHORIZED before hitting Clerk', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as AuthReturn);
    await expect(
      callRoute(['users', 'admins', 'list']),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 401 &&
        e.code === 'UNAUTHORIZED',
    );
    expect(mockClerkClient).not.toHaveBeenCalled();
  });
});
