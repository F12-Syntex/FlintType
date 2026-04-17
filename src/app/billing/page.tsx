import { PricingTable } from '@clerk/nextjs';
import { buildPageMetadata } from '@/server/seo';
import { IS_DEV } from '@/server/env';

export const metadata = buildPageMetadata({
  title: 'Billing',
  description:
    'Subscription management powered by Clerk Billing. Pick a plan, manage your subscription, update payment methods — all in one place.',
  path: '/billing',
  noIndex: true,
});

export default function BillingPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:gap-8 sm:px-8 sm:py-20">
      <header className="flex flex-col gap-3">
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          billing
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Subscription
        </h1>
        <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
          Powered by Clerk Billing. Checkout, cancel, resume, update payment
          method — all handled inline once billing is activated.
        </p>
      </header>

      {IS_DEV && <DevSetupNotice />}

      <PricingTable />
    </main>
  );
}

function DevSetupNotice() {
  return (
    <aside className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-100 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
        boilerplate notice (development only)
      </p>
      <p className="leading-6">
        Clerk Billing isn&apos;t activated out of the box — this is a{' '}
        <strong>boilerplate</strong>, not a live product. Activating it is a
        downstream-app decision, not a prerequisite for using the repo. If the
        pricing grid below is empty, billing hasn&apos;t been enabled on your
        Clerk instance yet.
      </p>
      <p className="leading-6">
        To turn it on in your fork: claim the Clerk instance, flip{' '}
        <em>Billing → Enable user billing</em> in the dashboard, connect Stripe
        (dev instances auto-use Stripe test mode), then create a plan with slug{' '}
        <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
          pro
        </code>{' '}
        (must match{' '}
        <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
          PLANS.pro
        </code>{' '}
        in{' '}
        <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
          src/server/plans.ts
        </code>
        ). Full walkthrough in{' '}
        <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
          docs/payments.md
        </code>
        . Test card{' '}
        <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
          4242 4242 4242 4242
        </code>{' '}
        once live.
      </p>
      <p className="leading-6 text-xs">
        This notice is hidden in production (
        <code className="rounded bg-zinc-200 px-1 py-0.5 dark:bg-zinc-800">
          APP_ENV=production
        </code>
        ).
      </p>
    </aside>
  );
}
