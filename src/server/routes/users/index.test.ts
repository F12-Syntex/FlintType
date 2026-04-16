import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { BackendError } from '@/lib/errors';
import { callRoute } from '@/server/testing';
import type { GetUserOutput, ListUsersOutput } from '@/types/user';

const asUser = { 'x-user-id': 'u_2' };
const asAdmin = { 'x-user-id': 'u_1' };

describe('users.list', () => {
  it('rejects unauthenticated callers', async () => {
    await expect(callRoute(['users', 'list'])).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 401 &&
        e.code === 'UNAUTHORIZED',
    );
  });

  it('rejects unknown user ids', async () => {
    await expect(
      callRoute(['users', 'list'], { headers: { 'x-user-id': 'ghost' } }),
    ).rejects.toSatisfy(
      (e: unknown) => e instanceof BackendError && e.status === 401,
    );
  });

  it('returns the full list for any authenticated caller', async () => {
    const out = await callRoute<ListUsersOutput>(['users', 'list'], {
      headers: asUser,
    });
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('users.get', () => {
  it('returns a user by id', async () => {
    const out = await callRoute<GetUserOutput>(['users', 'get'], {
      headers: asUser,
      input: { id: 'u_1' },
    });
    expect(out.id).toBe('u_1');
    expect(out.role).toBe('admin');
  });

  it('throws NOT_FOUND for an unknown id', async () => {
    await expect(
      callRoute(['users', 'get'], {
        headers: asAdmin,
        input: { id: 'nope' },
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 404 &&
        e.code === 'NOT_FOUND',
    );
  });

  it('rejects missing id via Zod (VALIDATION)', async () => {
    await expect(
      callRoute(['users', 'get'], { headers: asUser, input: {} }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it('rejects non-string id via Zod', async () => {
    await expect(
      callRoute(['users', 'get'], {
        headers: asUser,
        input: { id: 42 },
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
