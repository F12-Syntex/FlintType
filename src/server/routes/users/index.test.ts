import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { BackendError } from '@/lib/errors';
import { callRoute } from '@/server/testing';
import type { GetUserOutput, ListUsersOutput } from '@/types/user';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
}));

import { auth } from '@clerk/nextjs/server';

const mockAuth = vi.mocked(auth);

type AuthReturn = Awaited<ReturnType<typeof auth>>;

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
});

describe('users.list', () => {
  it('rejects unauthenticated callers', async () => {
    asAnon();
    await expect(callRoute(['users', 'list'])).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 401 &&
        e.code === 'UNAUTHORIZED',
    );
  });

  it('returns the full list for any authenticated caller', async () => {
    asUser();
    const out = await callRoute<ListUsersOutput>(['users', 'list']);
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('users.get', () => {
  it('returns a user by id', async () => {
    asUser();
    const out = await callRoute<GetUserOutput>(['users', 'get'], {
      input: { id: 'u_1' },
    });
    expect(out.id).toBe('u_1');
    expect(out.role).toBe('admin');
  });

  it('throws NOT_FOUND for an unknown id', async () => {
    asAdmin();
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
