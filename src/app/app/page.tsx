import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata } from '@/server/seo';

export const metadata = buildPageMetadata({
  title: 'App',
  description: 'Signed-in home for flinttype.',
  path: '/app',
  noIndex: true,
});

export default async function AppHome() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  const user = await currentUser();
  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.emailAddresses[0]?.emailAddress ||
    'there';

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10 sm:px-8 sm:py-20">
        <header className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            signed in
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Welcome, {name}.
          </h1>
        </header>
      </main>
    </div>
  );
}
