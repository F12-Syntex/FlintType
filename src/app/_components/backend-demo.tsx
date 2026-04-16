'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [pingLoading, setPingLoading] = useState(false);
  const [message, setMessage] = useState('hello');
  const [echoed, setEchoed] = useState<Result | null>(null);
  const [echoLoading, setEchoLoading] = useState(false);
  const [list, setList] = useState<Result | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [adminList, setAdminList] = useState<Result | null>(null);
  const [adminListLoading, setAdminListLoading] = useState(false);

  useEffect(() => {
    setBackendHeaders(() => {
      const headers: Record<string, string> = {};
      if (userId) headers['x-user-id'] = userId;
      return headers;
    });
  }, [userId]);

  async function runPing() {
    setPingLoading(true);
    try {
      const r = await backend.health.ping();
      setPing({ ok: true, text: fmt(r) });
    } catch (err) {
      setPing(resultFromError(err));
    } finally {
      setPingLoading(false);
    }
  }

  async function runEcho() {
    setEchoLoading(true);
    try {
      const r = await backend.echo.say({ message });
      setEchoed({ ok: true, text: fmt(r) });
    } catch (err) {
      setEchoed(resultFromError(err));
    } finally {
      setEchoLoading(false);
    }
  }

  async function runList() {
    setListLoading(true);
    try {
      const r: User[] = await backend.users.list();
      setList({ ok: true, text: fmt(r) });
    } catch (err) {
      setList(resultFromError(err));
    } finally {
      setListLoading(false);
    }
  }

  async function runAdminList() {
    setAdminListLoading(true);
    try {
      const r: User[] = await backend.users.admins.list();
      setAdminList({ ok: true, text: fmt(r) });
    } catch (err) {
      setAdminList(resultFromError(err));
    } finally {
      setAdminListLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
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

      <Demo
        title="backend.health.ping()"
        label="ping"
        result={ping}
        onRun={runPing}
        loading={pingLoading}
      />
      <Demo
        title="backend.echo.say({ message })"
        label="say"
        result={echoed}
        onRun={runEcho}
        loading={echoLoading}
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
        result={list}
        onRun={runList}
        loading={listLoading}
      />
      <Demo
        title="backend.users.admins.list()  // requireAuth + requireAdmin"
        label="list admins"
        result={adminList}
        onRun={runAdminList}
        loading={adminListLoading}
      />
    </section>
  );
}

function Demo({
  title,
  label,
  result,
  onRun,
  loading,
  extra,
}: {
  title: string;
  label: string;
  result: Result | null;
  onRun: () => void;
  loading: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center gap-3">
        {extra}
        <Button onClick={onRun} disabled={loading} aria-busy={loading}>
          {loading ? `${label}…` : <code className="text-xs">{title}</code>}
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
