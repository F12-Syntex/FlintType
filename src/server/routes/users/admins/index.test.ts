import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendError } from '@/lib/errors';
import { callRoute } from '@/server/testing';
import type { ListAdminsOutput } from '@/types/user';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
}));

import { auth } from '@clerk/nextjs/server';

const mockAuth = vi.mocked(auth);

type AuthReturn = Awaited<ReturnType<typeof auth>>;

beforeEach(() => {
  mockAuth.mockReset();
});

describe('users.admins.list', () => {
  it('returns admin users when called by an admin', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_1',
      sessionClaims: { metadata: { role: 'admin' } },
    } as unknown as AuthReturn);
    const out = await callRoute<ListAdminsOutput>([
      'users',
      'admins',
      'list',
    ]);
    expect(out.length).toBeGreaterThan(0);
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
  });

  it('rejects unauthenticated callers with UNAUTHORIZED (parent middleware runs first)', async () => {
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
  });
});
