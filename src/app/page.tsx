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
      <main className="mx-auto flex max-w-3xl flex-col items-center gap-8 px-4 py-20 sm:py-32">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/flinttype-logo.svg"
          alt=""
          aria-hidden
          className="h-24 w-auto"
        />
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
          flinttype
        </h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/sign-up" className={buttonVariants()}>
            Get started
          </Link>
          <Link href="/sign-in" className={buttonVariants({ variant: 'outline' })}>
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
