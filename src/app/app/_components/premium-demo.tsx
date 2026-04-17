'use client';

import Link from 'next/link';
import { Show } from '@clerk/nextjs';
import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { useBackend } from '@/lib/backend';
import { useAsyncAction } from '@/lib/use-async-action';

export function PremiumDemo() {
  const backend = useBackend();
  const action = useAsyncAction(() => backend.premium.ping());

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          premium demo (pro plan)
        </span>
        <p className="text-xs text-zinc-500">
          Gated by{' '}
          <code className="rounded bg-zinc-200 px-1 py-0.5 dark:bg-zinc-800">
            requirePlan(PLANS.pro)
          </code>
          . Subscribe on{' '}
          <Link
            href="/billing"
            className="underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            /billing
          </Link>{' '}
          to unlock — the 402 response below branches to an upgrade link.
        </p>
      </div>

      <Show when="signed-out">
        <p className="text-xs text-zinc-500">
          Sign in from the header to try it.
        </p>
      </Show>

      <Show when="signed-in">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={action.run}
            disabled={action.loading}
            size="sm"
            aria-busy={action.loading}
          >
            {action.loading ? 'checking…' : 'ping premium'}
          </Button>
        </div>

        {action.result?.ok && (
          <pre className="overflow-x-auto rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
            {JSON.stringify(action.result.data, null, 2)}
          </pre>
        )}

        {action.result && !action.result.ok && (
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-red-600 dark:text-red-400">
              [{action.result.code}] {action.result.message}
            </span>
            {action.result.code === 'PAYMENT_REQUIRED' && (
              <Link
                href="/billing"
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
              >
                Upgrade
              </Link>
            )}
          </div>
        )}
      </Show>
    </div>
  );
}
