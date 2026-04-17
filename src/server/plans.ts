/**
 * Canonical plan-key registry. Matches the slugs configured in the Clerk
 * dashboard under Billing → Plans. Clerk's `has({ plan })` helper requires
 * the `user:` (B2C) or `org:` (B2B) prefix — never hand-write that prefix
 * outside this file. Add a row here *and* create the matching plan in the
 * Clerk dashboard in the same commit.
 *
 * See `docs/payments.md` for dashboard setup.
 */
export const PLANS = {
  pro: 'user:pro',
} as const;

export type PlanName = keyof typeof PLANS;
export type PlanKey = (typeof PLANS)[PlanName];
