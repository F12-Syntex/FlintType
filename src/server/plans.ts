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

/**
 * Matches Clerk's native `has({ plan })` param type. Widened beyond the
 * literal values of `PLANS` so multi-plan gates and future additions
 * (`PLANS.team`, org-scoped plans) type-check without template gymnastics.
 * The "always import from PLANS" rule (P1 in docs/payments.md) is a
 * discipline constraint, not a type constraint — same as the AI preset
 * registry.
 */
export type PlanKey = `user:${string}` | `org:${string}`;
