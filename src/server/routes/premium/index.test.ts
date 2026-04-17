import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendError } from '@/lib/errors';
import { PLANS } from '@/server/plans';
import { callRoute } from '@/server/testing';
import type { PremiumPingOutput } from '@/types/premium';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({
    userId: null,
    sessionClaims: null,
    has: () => false,
  })),
}));

import { auth } from '@clerk/nextjs/server';

const mockAuth = vi.mocked(auth);
type AuthReturn = Awaited<ReturnType<typeof auth>>;

function mockSession(opts: {
  userId?: string | null;
  has?: (params: { plan: string }) => boolean;
}) {
  mockAuth.mockResolvedValue({
    userId: opts.userId ?? null,
    sessionClaims: null,
    has: opts.has ?? (() => false),
  } as unknown as AuthReturn);
}

beforeEach(() => {
  mockAuth.mockReset();
});

describe('premium.ping', () => {
  it('returns ok + plan + ts for a signed-in user on the pro plan', async () => {
    mockSession({
      userId: 'user_1',
      has: ({ plan }) => plan === PLANS.pro,
    });
    const out = await callRoute<PremiumPingOutput>(['premium', 'ping']);
    expect(out.ok).toBe(true);
    expect(out.plan).toBe(PLANS.pro);
    expect(typeof out.ts).toBe('number');
  });

  it('rejects unauthenticated callers with UNAUTHORIZED (from requireAuth)', async () => {
    mockSession({ userId: null });
    await expect(callRoute(['premium', 'ping'])).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError && e.code === 'UNAUTHORIZED',
    );
  });

  it('rejects signed-in callers without the plan using PAYMENT_REQUIRED', async () => {
    mockSession({ userId: 'user_1', has: () => false });
    await expect(callRoute(['premium', 'ping'])).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 402 &&
        e.code === 'PAYMENT_REQUIRED',
    );
  });
});
