import { PricingTable } from '@clerk/nextjs';
import { buildPageMetadata } from '@/server/seo';

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
          method — all handled inline. In development your Clerk instance runs
          against Stripe test mode: card{' '}
          <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">
            4242 4242 4242 4242
          </code>{' '}
          with any future expiry and any CVC goes through.
        </p>
      </header>
      <PricingTable />
    </main>
  );
}
