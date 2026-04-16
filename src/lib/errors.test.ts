import { describe, expect, it } from 'vitest';
import { BackendError } from './errors';

describe('BackendError', () => {
  it('captures status, code, and message', () => {
    const err = new BackendError(404, 'NOT_FOUND', 'gone');
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('gone');
    expect(err.name).toBe('BackendError');
    expect(err).toBeInstanceOf(Error);
  });

  it('toJSON omits details when none provided', () => {
    const err = new BackendError(400, 'VALIDATION', 'bad input');
    expect(err.toJSON()).toEqual({
      error: 'bad input',
      code: 'VALIDATION',
      status: 400,
    });
  });

  it('toJSON includes details when provided', () => {
    const err = new BackendError(400, 'VALIDATION', 'bad input', {
      field: 'email',
    });
    expect(err.toJSON()).toEqual({
      error: 'bad input',
      code: 'VALIDATION',
      status: 400,
      details: { field: 'email' },
    });
  });

  it('toJSON serializes via JSON.stringify cleanly', () => {
    const err = new BackendError(401, 'UNAUTHORIZED', 'no session', {
      reason: 'expired',
    });
    const parsed = JSON.parse(JSON.stringify(err));
    expect(parsed).toEqual({
      error: 'no session',
      code: 'UNAUTHORIZED',
      status: 401,
      details: { reason: 'expired' },
    });
  });

  it('preserves the details reference on the instance', () => {
    const details = { issues: [{ path: ['x'], message: 'required' }] };
    const err = new BackendError(400, 'VALIDATION', 'invalid', details);
    expect(err.details).toBe(details);
  });
});
