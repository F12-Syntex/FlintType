# Payments

Authoritative guide for subscription billing in this repo. Provider is **Clerk Billing** — a UI + entitlement layer on top of Stripe. Stripe processes payments under the hood; Clerk owns the plan catalog, checkout UI, entitlement API, and webhooks.

## Why Clerk Billing (and not direct Stripe)

We deliberately skip the direct-Stripe path. Trade-offs:

- **No webhook to maintain.** Clerk handles the Stripe webhook plumbing — no signature verification, idempotency store, event-ordering logic, or subscription mirror table to keep honest. Zero infra surface.
- **No DB schema.** Entitlements come from session claims (`auth().has({ plan })`), not a mirror table. The subscriptions data lives in Stripe (truth) and Clerk (cache) — we never copy it into our Postgres.
- **Drop-in UI.** `<PricingTable />` renders the pricing grid + checkout flow. `<UserButton />` gets a "Manage Subscription" link automatically once Billing is enabled. Our `/billing` page is twelve lines of code.
- **Cost:** Clerk adds **0.7%** on top of Stripe fees. On $100k ARR that's $700/yr — trivial at indie scale, meaningful at $1M+.

What you give up:
- **USD only** as of April 2026 (multi-currency is on Clerk's roadmap, no ETA). If you need GBP/EUR/etc. at launch, this integration won't fit — see the migration appendix at the bottom.
- **No refunds UI** in Clerk. Refunds go through the Stripe dashboard manually.
- **Metered billing still in beta** on Clerk. Direct Stripe has GA usage billing.
- **Geographic gaps.** Clerk Billing isn't available in Brazil, India, Malaysia, Mexico, Singapore, Thailand.
- **Vendor concentration.** Clerk handles auth *and* billing; an outage hits both.

If any of those apply to your product, skip to the migration appendix for the direct-Stripe pattern.

## What ships

- `src/server/plans.ts` — canonical plan-key registry. One edit point. Slugs match Clerk dashboard plans and carry the `user:` (B2C) or `org:` (B2B) prefix Clerk's `has()` helper requires.
- `src/server/middleware/require-plan.ts` — gates routes on `auth().has({ plan })`. Throws `BackendError(402, 'PAYMENT_REQUIRED', …, { plans })` on failure. Must run after `requireAuth`.
- `src/server/routes/premium/index.ts` — one gated demo route (`premium.ping`).
- `src/app/billing/page.tsx` — mounts `<PricingTable />`. Everything else (checkout, cancel, update card, invoices) is Clerk-rendered inline.
- Home-page card (`src/app/_components/premium-demo.tsx`) exercising the three client states: signed-out, signed-in-no-plan (shows **Upgrade** link branching on `PAYMENT_REQUIRED`), signed-in-with-plan (200).

## Prerequisites (one-time setup)

### 1. Claim your Clerk instance and paste real keys

The boilerplate boots in Clerk's **keyless mode** by default (auto-generated dev keys). Billing requires real keys because Clerk has to persist your Stripe connection. Steps:

1. Run `yarn dev`, click the "Claim application" prompt at the bottom of the page, finish the browser flow.
2. Paste the `Publishable key` and `Secret key` Clerk shows you into `.env.local`:
   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```
3. Restart dev.

### 2. Enable Clerk Billing + connect Stripe

In the Clerk dashboard:

1. **Billing → Overview → Enable** for this instance.
2. Click **Connect Stripe**. Dev instances automatically bind to **Stripe test mode** — no separate toggle, no separate keys. For production Clerk instances, you connect a live Stripe account instead.
3. Set the payer type: **User** (B2C — what this boilerplate demonstrates) or **Organization** (B2B).

### 3. Create the `pro` plan

In Clerk dashboard:

1. **Billing → Plans → Create Plan**.
2. **Slug** = `pro` (this must match `PLANS.pro` in `src/server/plans.ts`, which maps to `user:pro`).
3. **Name** / description / features — anything you want shown on the pricing table.
4. **Price** — USD only as of now. Monthly and annual both OK.
5. Save.

Adding more plans is "add a slug to `PLANS` + create the matching plan in the dashboard" — both in one commit.

### 4. (Optional) Customize the Customer Portal / User Profile billing tab

Clerk's `<UserButton />` dropdown automatically gets a "Manage Subscription" entry once Billing is enabled — it links into a portal-like flow (change plan, cancel, update card, view invoices). No code to wire up. The billing-tab styling can be customized via Clerk's appearance API if you want to match the app's theme.

## Gating routes by plan

```ts
import { defineNamespace, defineRoute } from '@/server';
import { requireAuth } from '@/server/middleware/auth';
import { requirePlan } from '@/server/middleware/require-plan';
import { PLANS } from '@/server/plans';

const onlyForPro = defineRoute<void, Output>({
  middleware: [requireAuth, requirePlan(PLANS.pro)],
  handler: () => ({ ... }),
});
```

Multiple plans grant access to the same route:

```ts
middleware: [requireAuth, requirePlan([PLANS.pro, PLANS.team])],
```

**Ordering rule.** `requirePlan` always goes *after* `requireAuth`. It reads `ctx.meta.userId` to distinguish "not signed in" (401, `requireAuth`'s job) from "signed in but not subscribed" (402, `requirePlan`'s job). Reversing the order would leak the wrong error shape to the client.

**Error code.** `PAYMENT_REQUIRED` is HTTP 402 and carries `details.plans` listing the accepted plan keys. Client-side branching:

```tsx
if (result.code === 'PAYMENT_REQUIRED') {
  // steer user to /billing
}
```

## Gating UI

Server components:

```tsx
import { auth } from '@clerk/nextjs/server';
import { PLANS } from '@/server/plans';

export default async function Page() {
  const { has } = await auth();
  if (!has({ plan: PLANS.pro })) return <Upgrade />;
  return <Feature />;
}
```

Client components — use Clerk's `<Protect>`:

```tsx
import { Protect } from '@clerk/nextjs';

<Protect plan="user:pro" fallback={<Upgrade />}>
  <Feature />
</Protect>
```

## Testing in dev / sandbox

Dev Clerk instances use Stripe test mode automatically. Standard Stripe test cards work inside the checkout iframe:

| Card                          | Behavior                                    |
|-------------------------------|---------------------------------------------|
| `4242 4242 4242 4242`         | Succeeds immediately                        |
| `4000 0025 0000 3155`         | Requires 3DS authentication (succeeds)      |
| `4000 0000 0000 9995`         | Declined: insufficient funds                |
| `4000 0000 0000 0002`         | Declined: generic                           |
| `4000 0000 0000 0341`         | Attaches OK, later renewal fails            |

Any future expiry date, any 3-digit CVC, any postal code.

To simulate renewals / payment failures without waiting months, use Stripe's **sandbox time-advance** feature on the Stripe dashboard (Developers → Testing → Advance time). The time-forward event cascades through Clerk to your app's session.

Sign out + back in (or refresh the page) to pick up updated entitlement claims after subscribing — session claims refresh on next load.

## Production deploy checklist

- [ ] Clerk instance promoted to production (separate Publishable + Secret keys in production `.env.local` — never reuse dev keys).
- [ ] Stripe connected to the production Clerk instance (uses Stripe live mode automatically).
- [ ] Same plan slugs created in the production Clerk instance (slugs aren't copied between instances — recreate them).
- [ ] `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/` etc. set (already in `.env`; verify they match production URLs).
- [ ] `/billing` verified end-to-end with a real card in a staging deploy before launch.

## Rules

### P1. Never hand-write a plan key outside `src/server/plans.ts`
Import `PLANS.pro` / `PLANS.team` from `src/server/plans.ts`. The `user:` / `org:` prefix Clerk requires is encoded in that file — don't duplicate the encoding in handlers, middleware, or components.

**Why:** adding or renaming a plan is a one-line change when the string lives in one place. Scattered `'user:pro'` literals invite a dashboard-vs-code drift.

### P2. `requirePlan` always follows `requireAuth`
The two compose in that exact order in the middleware list. Reversing it breaks the 401-vs-402 distinction and throws 500 (INTERNAL) in tests — that's deliberate; the middleware fails fast on programmer error.

### P3. Plan-gated routes are always authenticated
There is no such thing as a "free plan" route. Free users are users without an active paid plan; they still go through `requireAuth`. `PLANS` only enumerates paid tiers.

### P4. Plan slugs match between code and Clerk dashboard, or nothing works
A row in `PLANS` without a matching dashboard plan → `has()` returns false forever, users can't subscribe, you get silent 402s. Add both or neither in one commit.

### P5. Never log, persist, or return session claims beyond the entitlement boolean
Session claims are JWT payload; treat them like bearer tokens (same as auth.md A4). Log `ctx.meta.userId` and the plan decision — never the full claim object.

## Migration appendix — swapping to direct Stripe

If you outgrow Clerk Billing (hit the USD-only, refunds-UI, metered-billing, or geographic limit), the swap is bounded and documented. Rough recipe:

1. **Install Stripe SDK, add a `subscriptions` table** (PK `stripeSubscriptionId`, FK to `users`), and `stripe_events` idempotency table.
2. **Move plans out of the Clerk dashboard into Stripe** (create Products + Prices). Your existing `PLANS` file flips from `'user:pro'` slugs to Stripe price IDs — same edit point, different contents.
3. **Write `/api/stripe/webhook`** as a *raw* route (bypassing our JSON dispatcher; signature verification needs raw body). Handle `customer.subscription.created|updated|deleted` and `invoice.payment_failed`. Idempotency via inserting `event.id` into `stripe_events` inside a `db.transaction(...)`.
4. **Replace `requirePlan`** with a version that reads from local `subscriptions` instead of `auth().has()`. Same middleware signature, same error code.
5. **Replace `<PricingTable />`** on `/billing` with a custom pricing grid + a server action that calls `stripe.checkout.sessions.create({ mode: 'subscription', ... })` and returns `{ url }` for the client to redirect.
6. **Add a portal button** calling `stripe.billingPortal.sessions.create({ customer })` for subscription management.

You keep: `PLANS` registry pattern, `requirePlan` signature, `PAYMENT_REQUIRED` error code, `/billing` page shell, `premium-demo.tsx` three-state card. You rewrite: one middleware body, the checkout/portal wiring, the pricing UI.

Rough scope: one focused migration weekend. Keep the `PLANS` abstraction so downstream code doesn't care which backend is authoritative.

## LLM checklist before submitting a payments change

- [ ] Is every plan key in `PLANS` (`src/server/plans.ts`), nowhere else (P1)?
- [ ] Does every `requirePlan` sit after `requireAuth` in the middleware list (P2)?
- [ ] If you added a plan slug, did you also create it in the Clerk dashboard in the same commit (P4)?
- [ ] Are gated routes covered by tests that exercise both the success and `PAYMENT_REQUIRED` paths?
- [ ] Did you verify the flow manually in dev with a test card (`4242 4242 4242 4242`) at 375px and ≥ 1024px per ui-law §10.3?
