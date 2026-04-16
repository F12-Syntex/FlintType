'use client';

import { useCallback, useState } from 'react';
import { BackendError } from '@/lib/errors';

export type AsyncResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

export type AsyncAction<T> = {
  run: () => void;
  result: AsyncResult<T> | null;
  loading: boolean;
  reset: () => void;
};

/**
 * Runs an async function once and normalizes its outcome into an
 * {@link AsyncResult}. BackendError propagates its .code; anything else
 * becomes 'UNKNOWN'. Pure — safe to test without a React renderer.
 */
export async function runAsync<T>(
  fn: () => Promise<T>,
): Promise<AsyncResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof BackendError) {
      return { ok: false, code: err.code, message: err.message };
    }
    return {
      ok: false,
      code: 'UNKNOWN',
      message: err instanceof Error ? err.message : 'unknown error',
    };
  }
}

/**
 * Wraps an async function with loading + result state for a single button.
 * Callers render three UI states from the returned `loading` flag and the
 * `result` discriminated union.
 */
export function useAsyncAction<T>(fn: () => Promise<T>): AsyncAction<T> {
  const [result, setResult] = useState<AsyncResult<T> | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async () => {
    setLoading(true);
    setResult(await runAsync(fn));
    setLoading(false);
  }, [fn]);

  const reset = useCallback(() => setResult(null), []);

  return { run, result, loading, reset };
}
