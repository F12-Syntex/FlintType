import { defineNamespace, defineRoute } from '@/server';
import { requireAuth } from '@/server/middleware/auth';
import { requirePlan } from '@/server/middleware/require-plan';
import { PLANS } from '@/server/plans';
import type { PremiumPingOutput } from '@/types/premium';

/**
 * Dashboard-testable entitlement demo. Gated on Clerk Billing's `user:pro`
 * plan — without a pro subscription the route throws
 * `BackendError(402, 'PAYMENT_REQUIRED')`, which the UI branches on to
 * surface an upgrade link.
 */
const ping = defineRoute<void, PremiumPingOutput>({
  middleware: [requireAuth, requirePlan(PLANS.pro)],
  handler: () => ({
    ok: true,
    plan: PLANS.pro,
    ts: Date.now(),
  }),
});

export const premium = defineNamespace({
  routes: { ping },
});
