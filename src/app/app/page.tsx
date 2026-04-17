import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/server/seo';
import { AiDemo } from './_components/ai-demo';
import { BackendDemo } from './_components/backend-demo';
import { LocalNotesDemo } from './_components/local-notes-demo';
import { PremiumDemo } from './_components/premium-demo';
import { RateLimitDemo } from './_components/ratelimit-demo';

export const metadata = buildPageMetadata({
  title: 'App',
  description:
    'Signed-in home. Live demo of the typed useBackend() client: health ping, validated echo, authenticated user lookups, AI, rate limiting, premium gating, and the local PGlite store.',
  path: '/app',
  noIndex: true,
});

export default async function AppHome() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10 sm:gap-10 sm:px-8 sm:py-20">
        <header className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            signed in
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Your app
          </h1>
          <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Backend routes live in <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">src/server/routes</code> and are consumed from the client via a typed <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">useBackend()</code> hook.
          </p>
        </header>
        <BackendDemo />
        <AiDemo />
        <RateLimitDemo />
        <PremiumDemo />
        <LocalNotesDemo />
      </main>
    </div>
  );
}
