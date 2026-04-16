import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@/db/server';
import { BackendError } from '@/lib/errors';
import { logger } from '../logger';
import type { RouteContext } from '../types';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
}));

import { auth } from '@clerk/nextjs/server';
import { requireAdmin, requireAuth } from './auth';

const mockAuth = vi.mocked(auth);

const fakeDb = {} as Database;

function ctx(meta: Record<string, unknown> = {}): RouteContext {
  return {
    input: undefined,
    req: new NextRequest('http://localhost/api/x/y', { method: 'POST' }),
    meta,
    log: logger,
    db: fakeDb,
  };
}

beforeEach(() => {
  mockAuth.mockReset();
});

describe('requireAuth (Clerk)', () => {
  it('calls next and sets ctx.meta.userId when Clerk returns a userId', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_abc',
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    const c = ctx();
    const next = vi.fn(async () => 'ok');
    const result = await requireAuth(c, next);
    expect(result).toBe('ok');
    expect(next).toHaveBeenCalledOnce();
    expect(c.meta.userId).toBe('user_abc');
  });

  it('throws UNAUTHORIZED when Clerk returns no userId', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      requireAuth(ctx(), async () => 'never'),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 401 &&
        e.code === 'UNAUTHORIZED',
    );
  });

  it('does not call next when unauthenticated', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    const next = vi.fn(async () => 'never');
    await expect(requireAuth(ctx(), next)).rejects.toBeInstanceOf(BackendError);
    expect(next).not.toHaveBeenCalled();
  });

  it('propagates sessionClaims onto ctx.meta for downstream role checks', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_1',
      sessionClaims: { metadata: { role: 'admin' } },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    const c = ctx();
    await requireAuth(c, async () => 'ok');
    expect(c.meta.sessionClaims).toEqual({ metadata: { role: 'admin' } });
  });
});

describe('requireAdmin', () => {
  it('calls next when sessionClaims.metadata.role === "admin"', async () => {
    const c = ctx({
      userId: 'user_1',
      sessionClaims: { metadata: { role: 'admin' } },
    });
    const next = vi.fn(async () => 'ok');
    const result = await requireAdmin(c, next);
    expect(result).toBe('ok');
    expect(next).toHaveBeenCalledOnce();
  });

  it('throws FORBIDDEN when the role is not admin', async () => {
    const c = ctx({
      userId: 'user_1',
      sessionClaims: { metadata: { role: 'user' } },
    });
    await expect(
      requireAdmin(c, async () => 'never'),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 403 &&
        e.code === 'FORBIDDEN',
    );
  });

  it('throws FORBIDDEN when session claims are absent', async () => {
    const c = ctx({ userId: 'user_1' });
    await expect(
      requireAdmin(c, async () => 'never'),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 403 &&
        e.code === 'FORBIDDEN',
    );
  });

  it('throws INTERNAL when run without requireAuth setting ctx.meta.userId', async () => {
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
    const c = ctx({
      userId: 'user_1',
      sessionClaims: { metadata: { role: 'user' } },
    });
    const next = vi.fn(async () => 'never');
    await expect(requireAdmin(c, next)).rejects.toBeInstanceOf(BackendError);
    expect(next).not.toHaveBeenCalled();
  });
});
