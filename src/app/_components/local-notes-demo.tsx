'use client';

import dynamic from 'next/dynamic';

const LocalNotesInner = dynamic(() => import('./local-notes-inner'), {
  ssr: false,
  loading: () => (
    <p className="text-sm text-zinc-600 dark:text-zinc-400">
      Loading local database…
    </p>
  ),
});

export function LocalNotesDemo() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          local notes (browser PGlite)
        </span>
        <p className="text-xs text-zinc-500">
          Persists in your browser (IndexedDB). Never hits the server.
        </p>
      </div>
      <LocalNotesInner />
    </div>
  );
}
