'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BackendError, setBackendHeaders, useBackend } from '@/lib/backend';
import type { User } from '@/types/user';

type Result = { ok: true; text: string } | { ok: false; code: string; text: string };

function fmt(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function resultFromError(err: unknown): Result {
  if (err instanceof BackendError) {
    return { ok: false, code: err.code, text: err.message };
  }
  return {
    ok: false,
    code: 'UNKNOWN',
    text: err instanceof Error ? err.message : 'unknown error',
  };
}

export function BackendDemo() {
  const backend = useBackend();
  const [userId, setUserId] = useState<'' | 'u_1' | 'u_2' | 'ghost'>('u_1');
  const [ping, setPing] = useState<Result | null>(null);
  const [message, setMessage] = useState('hello');
  const [echoed, setEchoed] = useState<Result | null>(null);
  const [list, setList] = useState<Result | null>(null);
  const [adminList, setAdminList] = useState<Result | null>(null);

  useEffect(() => {
    setBackendHeaders(() => {
      const headers: Record<string, string> = {};
      if (userId) headers['x-user-id'] = userId;
      return headers;
    });
  }, [userId]);

  async function runPing() {
    try {
      const r = await backend.health.ping();
      setPing({ ok: true, text: fmt(r) });
    } catch (err) {
      setPing(resultFromError(err));
    }
  }

  async function runEcho() {
    try {
      const r = await backend.echo.say({ message });
      setEchoed({ ok: true, text: fmt(r) });
    } catch (err) {
      setEchoed(resultFromError(err));
    }
  }

  async function runList() {
    try {
      const r: User[] = await backend.users.list();
      setList({ ok: true, text: fmt(r) });
    } catch (err) {
      setList(resultFromError(err));
    }
  }

  async function runAdminList() {
    try {
      const r: User[] = await backend.users.admins.list();
      setAdminList({ ok: true, text: fmt(r) });
    } catch (err) {
      setAdminList(resultFromError(err));
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <label className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          identity
        </label>
        <div className="flex gap-2">
          {(['u_1', 'u_2', 'ghost', ''] as const).map((id) => (
            <Button
              key={id || 'none'}
              variant={userId === id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setUserId(id)}
            >
              {id === 'u_1'
                ? 'Alice (admin)'
                : id === 'u_2'
                  ? 'Bob (user)'
                  : id === 'ghost'
                    ? 'ghost (unknown)'
                    : 'anonymous'}
            </Button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          sets <code>x-user-id</code> header; affects routes under <code>users</code>.
        </p>
      </div>

      <Demo title="backend.health.ping()" result={ping} onRun={runPing} />
      <Demo
        title="backend.echo.say({ message })"
        result={echoed}
        onRun={runEcho}
        extra={
          <input
            className="flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="message"
          />
        }
      />
      <Demo
        title="backend.users.list()  // requireAuth"
        result={list}
        onRun={runList}
      />
      <Demo
        title="backend.users.admins.list()  // requireAuth + requireAdmin"
        result={adminList}
        onRun={runAdminList}
      />
    </section>
  );
}

function Demo({
  title,
  result,
  onRun,
  extra,
}: {
  title: string;
  result: Result | null;
  onRun: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-3">
        {extra}
        <Button onClick={onRun}>
          <code className="text-xs">{title}</code>
        </Button>
      </div>
      {result && (
        <pre
          className={`overflow-x-auto rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-900 ${
            result.ok ? '' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {result.ok ? result.text : `[${result.code}] ${result.text}`}
        </pre>
      )}
    </div>
  );
}
