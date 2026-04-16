import { describe, expect, it } from 'vitest';
import { BackendError } from './errors';
import { safe } from './safe';

describe('safe', () => {
  it('returns ok:true with data when the promise resolves', async () => {
    const r = await safe(Promise.resolve({ id: 'p_1' }));
    expect(r).toEqual({ ok: true, data: { id: 'p_1' } });
  });

  it('returns ok:false with the original BackendError when thrown', async () => {
    const original = new BackendError(404, 'NOT_FOUND', 'gone', { id: 'u_9' });
    const r = await safe(Promise.reject(original));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe(original);
      expect(r.error.code).toBe('NOT_FOUND');
      expect(r.error.details).toEqual({ id: 'u_9' });
    }
  });

  it('wraps a plain Error in BackendError(500, INTERNAL) preserving message', async () => {
    const r = await safe(Promise.reject(new Error('kaboom')));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(BackendError);
      expect(r.error.status).toBe(500);
      expect(r.error.code).toBe('INTERNAL');
      expect(r.error.message).toBe('kaboom');
    }
  });

  it('wraps a non-Error throw as BackendError(500, INTERNAL, "Unknown error")', async () => {
    const r = await safe(Promise.reject('just a string'));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(BackendError);
      expect(r.error.code).toBe('INTERNAL');
      expect(r.error.message).toBe('Unknown error');
    }
  });

  it('preserves the resolved value type through the union', async () => {
    const r = await safe(Promise.resolve<number>(7));
    if (r.ok) {
      expect(r.data + 1).toBe(8);
    } else {
      expect.fail('expected ok branch');
    }
  });
});
