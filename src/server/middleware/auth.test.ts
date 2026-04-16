import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '@/types/user';
import { BackendError } from '@/lib/errors';
import { logger } from '../logger';
import type { RouteContext } from '../types';
import { requireAdmin, requireAuth } from './auth';

function ctx(
  headers: Record<string, string> = {},
  meta: Record<string, unknown> = {},
): RouteContext {
  return {
    input: undefined,
    req: new NextRequest('http://localhost/api/x/y', {
      method: 'POST',
      headers,
    }),
    meta,
    log: logger,
  };
}

describe('requireAuth', () => {
  it('calls next and sets ctx.meta.user when x-user-id matches a known user', async () => {
    const c = ctx({ 'x-user-id': 'u_1' });
    const next = vi.fn(async () => 'ok');
    const result = await requireAuth(c, next);
    expect(result).toBe('ok');
    expect(next).toHaveBeenCalledOnce();
    expect(c.meta.user).toMatchObject({ id: 'u_1', role: 'admin' });
    expect(c.meta.userId).toBe('u_1');
  });

  it('throws UNAUTHORIZED when x-user-id header is missing', async () => {
    await expect(
      requireAuth(ctx(), async () => 'never'),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 401 &&
        e.code === 'UNAUTHORIZED',
    );
  });

  it('throws UNAUTHORIZED when x-user-id does not match any known user', async () => {
    await expect(
      requireAuth(ctx({ 'x-user-id': 'ghost' }), async () => 'never'),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 401 &&
        e.code === 'UNAUTHORIZED',
    );
  });

  it('does not call next on failure', async () => {
    const next = vi.fn(async () => 'never');
    await expect(
      requireAuth(ctx(), next),
    ).rejects.toBeInstanceOf(BackendError);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireAdmin', () => {
  const admin: User = { id: 'u_1', name: 'Alice', role: 'admin' };
  const regular: User = { id: 'u_2', name: 'Bob', role: 'user' };

  it('calls next when ctx.meta.user.role === "admin"', async () => {
    const next = vi.fn(async () => 'ok');
    const result = await requireAdmin(ctx({}, { user: admin }), next);
    expect(result).toBe('ok');
    expect(next).toHaveBeenCalledOnce();
  });

  it('throws FORBIDDEN when ctx.meta.user is not an admin', async () => {
    await expect(
      requireAdmin(ctx({}, { user: regular }), async () => 'never'),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 403 &&
        e.code === 'FORBIDDEN',
    );
  });

  it('throws INTERNAL when run without requireAuth populating ctx.meta.user', async () => {
    await expect(
      requireAdmin(ctx(), async () => 'never'),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 500 &&
        e.code === 'INTERNAL',
    );
  });

  it('does not call next on failure', async () => {
    const next = vi.fn(async () => 'never');
    await expect(
      requireAdmin(ctx({}, { user: regular }), next),
    ).rejects.toBeInstanceOf(BackendError);
    expect(next).not.toHaveBeenCalled();
  });
});
