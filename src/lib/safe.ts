import { BackendError } from '@/lib/errors';

export type Safe<T> =
  | { ok: true; data: T }
  | { ok: false; error: BackendError };

/**
 * Wraps a backend call so failure becomes a typed result instead of a throw.
 *
 *   const r = await safe(backend.users.get({ id }));
 *   if (!r.ok) return r.error.code;
 *   r.data.name;
 */
export async function safe<T>(promise: Promise<T>): Promise<Safe<T>> {
  try {
    return { ok: true, data: await promise };
  } catch (err) {
    if (err instanceof BackendError) return { ok: false, error: err };
    return {
      ok: false,
      error: new BackendError(
        500,
        'INTERNAL',
        err instanceof Error ? err.message : 'Unknown error',
      ),
    };
  }
}
