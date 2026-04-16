'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useBackend } from '@/lib/backend';

export function BackendDemo() {
  const backend = useBackend();
  const [ping, setPing] = useState<string>('');
  const [message, setMessage] = useState('hello from the client');
  const [echoed, setEchoed] = useState<string>('');
  const [error, setError] = useState<string>('');

  async function runPing() {
    setError('');
    try {
      const r = await backend.health.ping();
      setPing(`ok=${r.ok} ts=${r.ts}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    }
  }

  async function runEcho() {
    setError('');
    try {
      const r = await backend.echo.say({ message });
      setEchoed(`${r.echoed} (${r.length})`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    }
  }

  return (
    <section className="flex flex-col gap-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Button onClick={runPing} variant="default">
            backend.health.ping()
          </Button>
          <code className="text-sm text-zinc-600 dark:text-zinc-400">
            {ping || '—'}
          </code>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <input
            className="flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="message"
          />
          <Button onClick={runEcho} variant="default">
            backend.echo.say()
          </Button>
        </div>
        <code className="text-sm text-zinc-600 dark:text-zinc-400">
          {echoed || '—'}
        </code>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </section>
  );
}
