import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '@/db/server';
import { BackendError } from '@/lib/errors';
import { PLANS } from '@/server/plans';
import { logger } from '../logger';
import type { RouteContext } from '../types';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({
    userId: null,
    sessionClaims: null,
    has: () => false,
  })),
}));

import { auth } from '@clerk/nextjs/server';
import { requirePlan } from './require-plan';

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

function mockSession(opts: {
  userId?: string | null;
  has?: (params: { plan: string }) => boolean;
}) {
  mockAuth.mockResolvedValue({
    userId: opts.userId ?? null,
    sessionClaims: null,
    has: opts.has ?? (() => false),
  } as unknown as Awaited<ReturnType<typeof auth>>);
}

beforeEach(() => {
  mockAuth.mockReset();
});

describe('requirePlan', () => {
  it('calls next when the user has the required plan', async () => {
    mockSession({
      userId: 'user_1',
      has: ({ plan }) => plan === PLANS.pro,
    });
    const mw = requirePlan(PLANS.pro);
    const next = vi.fn(async () => 'ok');
    const result = await mw(ctx({ userId: 'user_1' }), next);
    expect(result).toBe('ok');
    expect(next).toHaveBeenCalledOnce();
  });

  it('calls next when the user has any plan in a multi-plan gate', async () => {
    mockSession({
      userId: 'user_1',
      has: ({ plan }) => plan === PLANS.pro,
    });
    const mw = requirePlan([PLANS.pro]);
    await expect(
      mw(ctx({ userId: 'user_1' }), async () => 'ok'),
    ).resolves.toBe('ok');
  });

  it('throws PAYMENT_REQUIRED when the user has no matching plan', async () => {
    mockSession({
      userId: 'user_1',
      has: () => false,
    });
    const mw = requirePlan(PLANS.pro);
    await expect(
      mw(ctx({ userId: 'user_1' }), async () => 'never'),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 402 &&
        e.code === 'PAYMENT_REQUIRED',
    );
  });

  it('attaches the plans list in error details', async () => {
    mockSession({ userId: 'user_1', has: () => false });
    const mw = requirePlan(PLANS.pro);
    await expect(
      mw(ctx({ userId: 'user_1' }), async () => 'never'),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        Array.isArray((e.details as { plans: string[] }).plans) &&
        (e.details as { plans: string[] }).plans.includes(PLANS.pro),
    );
  });

  it('throws INTERNAL when run without requireAuth populating ctx.meta.userId', async () => {
    mockSession({ userId: null, has: () => false });
    const mw = requirePlan(PLANS.pro);
    await expect(
      mw(ctx(), async () => 'never'),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 500 &&
        e.code === 'INTERNAL',
    );
  });

  it('does not call next on rejection', async () => {
    mockSession({ userId: 'user_1', has: () => false });
    const mw = requirePlan(PLANS.pro);
    const next = vi.fn(async () => 'never');
    await expect(
      mw(ctx({ userId: 'user_1' }), next),
    ).rejects.toBeInstanceOf(BackendError);
    expect(next).not.toHaveBeenCalled();
  });

  it('throws when constructed with an empty plan list', () => {
    expect(() => requirePlan([] as unknown as readonly [])).toThrow();
  });
});
