import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@/db/server';
import { BackendError } from '@/lib/errors';
import { logger } from '../logger';
import type { RouteContext } from '../types';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
}));

vi.mock('@/server/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/server/env')>();
  return { ...actual, env: { ...actual.env, APP_ENV: 'development' } };
});

import { auth } from '@clerk/nextjs/server';
import { env } from '@/server/env';
import { requireAdminOrDev } from './admin-gate';

const mockAuth = vi.mocked(auth);
const mockEnv = env as { APP_ENV: 'development' | 'production' };

const fakeDb = {} as Database;

function ctx(meta: Record<string, unknown> = {}): RouteContext {
  return {
    input: undefined,
    req: new NextRequest('http://localhost/api/admin/x', { method: 'POST' }),
    meta,
    log: logger,
    db: fakeDb,
  };
}

beforeEach(() => {
  mockAuth.mockReset();
  mockEnv.APP_ENV = 'development';
});

afterEach(() => {
  mockEnv.APP_ENV = 'development';
});

describe('requireAdminOrDev — development', () => {
  it('passes through when no Clerk session is present', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    const c = ctx();
    const next = vi.fn(async () => 'ok');
    await expect(requireAdminOrDev(c, next)).resolves.toBe('ok');
    expect(next).toHaveBeenCalledOnce();
    expect(c.meta.userId).toBeUndefined();
  });

  it('copies userId and sessionClaims onto ctx.meta when Clerk returns a session', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_dev',
      sessionClaims: { foo: 'bar' },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    const c = ctx();
    await requireAdminOrDev(c, async () => 'ok');
    expect(c.meta.userId).toBe('user_dev');
    expect(c.meta.sessionClaims).toEqual({ foo: 'bar' });
  });

  it('still passes through when auth() itself throws (Clerk not configured)', async () => {
    mockAuth.mockRejectedValue(new Error('Clerk not configured'));
    const c = ctx();
    const next = vi.fn(async () => 'ok');
    await expect(requireAdminOrDev(c, next)).resolves.toBe('ok');
    expect(next).toHaveBeenCalledOnce();
  });
});

describe('requireAdminOrDev — production', () => {
  beforeEach(() => {
    mockEnv.APP_ENV = 'production';
  });

  it('throws UNAUTHORIZED when no session is present', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      requireAdminOrDev(ctx(), async () => 'never'),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 401 &&
        e.code === 'UNAUTHORIZED',
    );
  });

  it('throws FORBIDDEN for a signed-in non-admin', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_1',
      sessionClaims: { metadata: { role: 'user' } },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      requireAdminOrDev(ctx(), async () => 'never'),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 403 &&
        e.code === 'FORBIDDEN',
    );
  });

  it('passes through for a signed-in admin and copies claims', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_admin',
      sessionClaims: { metadata: { role: 'admin' } },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    const c = ctx();
    const next = vi.fn(async () => 'ok');
    await expect(requireAdminOrDev(c, next)).resolves.toBe('ok');
    expect(next).toHaveBeenCalledOnce();
    expect(c.meta.userId).toBe('user_admin');
    expect(c.meta.sessionClaims).toEqual({ metadata: { role: 'admin' } });
  });

  it('does not call next on failure', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    const next = vi.fn(async () => 'never');
    await expect(requireAdminOrDev(ctx(), next)).rejects.toBeInstanceOf(
      BackendError,
    );
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireAdminOrDev — hosted-deploy guard', () => {
  const originalVercel = process.env.VERCEL;

  beforeEach(() => {
    mockEnv.APP_ENV = 'development';
    process.env.VERCEL = '1';
  });

  afterEach(() => {
    if (originalVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = originalVercel;
  });

  it('refuses the dev bypass on a hosted deploy even when APP_ENV=development', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      requireAdminOrDev(ctx(), async () => 'never'),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 401 &&
        e.code === 'UNAUTHORIZED',
    );
  });

  it('enforces the admin role on a hosted deploy regardless of APP_ENV', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_1',
      sessionClaims: { metadata: { role: 'user' } },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    await expect(
      requireAdminOrDev(ctx(), async () => 'never'),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 403 &&
        e.code === 'FORBIDDEN',
    );
  });
});
