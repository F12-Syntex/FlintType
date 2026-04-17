import { auth } from '@clerk/nextjs/server';
import { BackendError } from '@/lib/errors';
import type { PlanKey } from '@/server/plans';
import type { Middleware } from '../types';

/**
 * Rejects callers whose active Clerk subscription doesn't include any of the
 * listed plans. Must run after {@link ./auth#requireAuth} — it relies on
 * `ctx.meta.userId` to distinguish "not signed in" (which is `requireAuth`'s
 * job to 401) from "signed in, needs upgrade" (402 here).
 *
 * Entitlements come from Clerk Billing via `auth().has({ plan })`. The plan
 * key must be prefixed `user:` (B2C) or `org:` (B2B) — do not pass raw
 * slugs; import from {@link @/server/plans}.
 *
 * Throws `BackendError(402, 'PAYMENT_REQUIRED', …, { plans })`.
 */
export function requirePlan(plan: PlanKey | readonly PlanKey[]): Middleware {
  const plans = Array.isArray(plan) ? [...plan] : [plan as PlanKey];
  if (plans.length === 0) {
    throw new Error('requirePlan: at least one plan key required');
  }

  return async (ctx, next) => {
    if (!ctx.meta.userId) {
      throw new BackendError(
        500,
        'INTERNAL',
        'requirePlan must run after requireAuth',
      );
    }

    const session = await auth();
    const allowed = plans.some((p) => session.has({ plan: p }));
    if (!allowed) {
      throw new BackendError(
        402,
        'PAYMENT_REQUIRED',
        `this resource requires one of: ${plans.join(', ')}`,
        { plans },
      );
    }
    return next();
  };
}
