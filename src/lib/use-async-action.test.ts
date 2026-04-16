import { describe, expect, it } from 'vitest';
import { BackendError } from './errors';
import { runAsync } from './use-async-action';

describe('runAsync', () => {
  it('returns ok:true with data on success', async () => {
    const r = await runAsync(async () => ({ value: 42 }));
    expect(r).toEqual({ ok: true, data: { value: 42 } });
  });

  it('returns ok:false with code + message for a BackendError', async () => {
    const r = await runAsync(async () => {
      throw new BackendError(404, 'NOT_FOUND', 'gone');
    });
    expect(r).toEqual({ ok: false, code: 'NOT_FOUND', message: 'gone' });
  });

  it('returns ok:false with code=UNKNOWN for a generic Error', async () => {
    const r = await runAsync(async () => {
      throw new Error('kaboom');
    });
    expect(r).toEqual({ ok: false, code: 'UNKNOWN', message: 'kaboom' });
  });

  it('returns ok:false with code=UNKNOWN for a non-Error throw', async () => {
    const r = await runAsync(async () => {
      throw 'plain string';
    });
    expect(r).toEqual({
      ok: false,
      code: 'UNKNOWN',
      message: 'unknown error',
    });
  });
});
