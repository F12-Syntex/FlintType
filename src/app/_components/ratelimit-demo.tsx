'use client';

import { useState } from 'react';
import { BackendError } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { useBackend } from '@/lib/backend';
import type { RateLimitPingOutput } from '@/types/ratelimit';

type Hit =
  | { ok: true; ts: number }
  | { ok: false; code: string; message: string; retryAfterMs?: number };

export function RateLimitDemo() {
  const backend = useBackend();
  const [hits, setHits] = useState<Hit[]>([]);
  const [config, setConfig] = useState<{ limit: number; windowMs: number } | null>(null);
  const [busy, setBusy] = useState(false);

  async function ping() {
    try {
      const out: RateLimitPingOutput = await backend.ratelimit.ping();
      setConfig({ limit: out.limit, windowMs: out.windowMs });
      setHits((prev) => [{ ok: true as const, ts: out.ts }, ...prev].slice(0, 20));
    } catch (err) {
      if (err instanceof BackendError) {
        const retryAfterMs =
          typeof err.details?.retryAfterMs === 'number'
            ? err.details.retryAfterMs
            : undefined;
        setHits((prev) =>
          [
            { ok: false as const, code: err.code, message: err.message, retryAfterMs },
            ...prev,
          ].slice(0, 20),
        );
      } else {
        setHits((prev) =>
          [
            {
              ok: false as const,
              code: 'UNKNOWN',
              message: err instanceof Error ? err.message : 'unknown error',
            },
            ...prev,
          ].slice(0, 20),
        );
      }
    }
  }

  async function runOnce() {
    setBusy(true);
    try {
      await ping();
    } finally {
      setBusy(false);
    }
  }

  async function runBurst() {
    setBusy(true);
    try {
      for (let i = 0; i < 8; i++) {
        await ping();
      }
    } finally {
      setBusy(false);
    }
  }

  const successes = hits.filter((h) => h.ok).length;
  const rejections = hits.filter((h) => !h.ok).length;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 sm:p-5">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          rate limit test
        </span>
        <p className="text-xs text-zinc-500">
          {config
            ? `${config.limit} requests per ${config.windowMs / 1000}s, keyed by IP. Smash the burst button to trip a 429.`
            : 'Hit ping to see the configured limit; burst to exceed it.'}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={runOnce} disabled={busy} size="sm">
          {busy ? 'pinging…' : 'ping once'}
        </Button>
        <Button
          onClick={runBurst}
          disabled={busy}
          variant="outline"
          size="sm"
        >
          {busy ? 'bursting…' : 'burst x8'}
        </Button>
        <Button
          onClick={() => setHits([])}
          disabled={busy || hits.length === 0}
          variant="outline"
          size="sm"
        >
          clear
        </Button>
      </div>

      {hits.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
          <span>ok: {successes}</span>
          <span>rejected: {rejections}</span>
        </div>
      )}

      {hits.length > 0 && (
        <ul className="flex flex-col gap-1">
          {hits.map((h, i) => (
            <li
              key={i}
              className="flex flex-col gap-1 rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between"
            >
              {h.ok ? (
                <>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    200 ok
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(h.ts).toLocaleTimeString()}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-red-600 dark:text-red-400">
                    [{h.code}] {h.message}
                  </span>
                  {typeof h.retryAfterMs === 'number' && (
                    <span className="text-xs text-zinc-500">
                      retry in {Math.ceil(h.retryAfterMs / 1000)}s
                    </span>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
