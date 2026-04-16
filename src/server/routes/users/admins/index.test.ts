import { describe, expect, it } from 'vitest';
import { BackendError } from '@/lib/errors';
import { callRoute } from '@/server/testing';
import type { ListAdminsOutput } from '@/types/user';

describe('users.admins.list', () => {
  it('returns only admin users when called by an admin', async () => {
    const out = await callRoute<ListAdminsOutput>(
      ['users', 'admins', 'list'],
      { headers: { 'x-user-id': 'u_1' } },
    );
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((u) => u.role === 'admin')).toBe(true);
  });

  it('rejects non-admin callers with FORBIDDEN', async () => {
    await expect(
      callRoute(['users', 'admins', 'list'], {
        headers: { 'x-user-id': 'u_2' },
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 403 &&
        e.code === 'FORBIDDEN',
    );
  });

  it('rejects unauthenticated callers with UNAUTHORIZED (parent middleware runs first)', async () => {
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
