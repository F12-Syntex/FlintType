'use client';

import { useState } from 'react';
import { Show } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBackend } from '@/lib/backend';
import type { AsyncResult } from '@/lib/use-async-action';
import { useAsyncAction } from '@/lib/use-async-action';

function fmt(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function BackendDemo() {
  const backend = useBackend();
  const [message, setMessage] = useState('hello');

  const ping = useAsyncAction(() => backend.health.ping());
  const echo = useAsyncAction(() => backend.echo.say({ message }));
  const list = useAsyncAction(() => backend.users.list());
  const adminList = useAsyncAction(() => backend.users.admins.list());

  return (
    <section className="flex flex-col gap-8">
      <Show when="signed-out">
        <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            session
          </span>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Sign in from the header. Routes under <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">users</code> require authentication; <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">users.admins</code> additionally requires <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">publicMetadata.role === &apos;admin&apos;</code>.
          </p>
        </div>
      </Show>

      <Demo title="backend.health.ping()" label="ping" action={ping} />
      <Demo
        title="backend.echo.say({ message })"
        label="say"
        action={echo}
        extra={
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="message"
            aria-label="echo message"
          />
        }
      />
      <Demo
        title="backend.users.list()  // requireAuth"
        label="list users"
        action={list}
      />
      <Demo
        title="backend.users.admins.list()  // requireAuth + requireAdmin"
        label="list admins"
        action={adminList}
      />
    </section>
  );
}

function Demo({
  title,
  label,
  action,
  extra,
}: {
  title: string;
  label: string;
  action: { run: () => void; loading: boolean; result: AsyncResult<unknown> | null };
  extra?: React.ReactNode;
}) {
  const { run, loading, result } = action;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-3">
        {extra}
        <Button onClick={run} disabled={loading} aria-busy={loading}>
          {loading ? `${label}…` : <code className="text-xs">{title}</code>}
        </Button>
      </div>
      {result && (
        <pre
          className={`overflow-x-auto rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-900 ${
            result.ok ? '' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {result.ok ? fmt(result.data) : `[${result.code}] ${result.message}`}
        </pre>
      )}
    </div>
  );
}
