import { buildPageMetadata } from '@/server/seo';
import { DatabaseDashboard } from './_components/database-dashboard';

export const metadata = buildPageMetadata({
  title: 'Admin',
  description: 'Database health and explorer. Admin-only in production; open in development.',
  path: '/admin',
  noIndex: true,
});

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:gap-10 sm:px-8 sm:py-20">
        <header className="flex flex-col gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            admin
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Database
          </h1>
          <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Health, stats, and row-level inspection for the active Postgres
            connection. For full schema browsing and editing, run{' '}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-sm dark:bg-zinc-800">
              yarn db:studio
            </code>{' '}
            — Drizzle Studio opens at{' '}
            <a
              href="https://local.drizzle.studio"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-zinc-400 underline-offset-4 hover:text-zinc-950 dark:hover:text-zinc-50"
            >
              local.drizzle.studio
            </a>
            .
          </p>
        </header>
        <DatabaseDashboard />
      </main>
    </div>
  );
}
