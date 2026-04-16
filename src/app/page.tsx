import { buildPageMetadata } from '@/server/seo';
import { BackendDemo } from './_components/backend-demo';
import { LocalNotesDemo } from './_components/local-notes-demo';

export const metadata = buildPageMetadata({
  title: 'Home',
  description:
    'Live demo of the typed useBackend() client: health ping, validated echo, authenticated user lookups, and an admin-gated nested route.',
  path: '/',
});

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-8 py-20">
        <header className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            shadcn-nextjs-boilerplate
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Next.js + shadcn + typed backend
          </h1>
          <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Backend routes live in <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">src/server/routes</code> and are consumed from the client via a typed <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">useBackend()</code> hook.
          </p>
        </header>
        <BackendDemo />
        <LocalNotesDemo />
      </main>
    </div>
  );
}
