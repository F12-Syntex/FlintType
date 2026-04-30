import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buttonVariants } from '@/components/ui/button';
import { buildPageMetadata } from '@/server/seo';

export const metadata = buildPageMetadata({
  title: 'Home',
  description:
    'flinttype — open-source typing speed test. Practice, measure your WPM, and track your progress.',
  path: '/',
});

export default async function Landing() {
  const { userId } = await auth();
  if (userId) redirect('/app');

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:gap-10 sm:px-8 sm:py-20">
        <header className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            flinttype
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Ship a typed full-stack app in a weekend.
          </h1>
          <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Next.js + shadcn with a typed backend you call from the client with full inference.
            Clerk auth and billing, Drizzle on Neon and browser PGlite, OpenRouter AI, structured
            logging — wired together and ready to fork.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          <Link href="/sign-up" className={buttonVariants()}>
            Get started
          </Link>
          <Link href="/sign-in" className={buttonVariants({ variant: 'outline' })}>
            Sign in
          </Link>
        </div>

        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            What&apos;s inside
          </span>
          <ul className="flex flex-col gap-2 text-base leading-7 text-zinc-600 dark:text-zinc-400">
            <li>
              <strong className="text-zinc-950 dark:text-zinc-50">Typed backend.</strong> Define a
              route, call it from the client via <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">useBackend()</code> with full types — no codegen.
            </li>
            <li>
              <strong className="text-zinc-950 dark:text-zinc-50">Auth + billing.</strong> Clerk
              sign-in, sign-up, session claims, role gates, and Stripe-backed subscriptions via
              Clerk Billing.
            </li>
            <li>
              <strong className="text-zinc-950 dark:text-zinc-50">Two-tier database.</strong>{' '}
              Drizzle schema shared between Neon (server) and PGlite in the browser.
            </li>
            <li>
              <strong className="text-zinc-950 dark:text-zinc-50">AI presets.</strong>{' '}
              OpenRouter-backed <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">ai.fast</code> / <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">ai.smart</code> / <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">ai.cheap</code> — swap models from a single file.
            </li>
            <li>
              <strong className="text-zinc-950 dark:text-zinc-50">Mobile-first UI.</strong>{' '}
              shadcn/ui + Tailwind, theme-switchable, accessible, verified at 375 px.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
