import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendError } from '@/lib/errors';

vi.mock('@/server/env', () => ({
  env: {
    APP_ENV: 'development',
    SITE_URL: 'http://localhost:3000',
    DATABASE_MODE: 'pglite',
    PGLITE_DATA_DIR: './.data/pglite',
    OPENROUTER_API_KEY: undefined as string | undefined,
  },
  IS_DEV: true,
  IS_PROD: false,
  IS_TEST: true,
  logEnabled: () => false,
  logLevel: () => 'debug' as const,
}));

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(),
}));

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '@/server/env';
import { getProvider, resetProvider } from './provider';

const mockCreate = vi.mocked(createOpenRouter);

beforeEach(() => {
  mockCreate.mockReset();
  resetProvider();
  (env as { OPENROUTER_API_KEY?: string }).OPENROUTER_API_KEY = undefined;
});

describe('getProvider', () => {
  it('throws BackendError(500, INTERNAL) when OPENROUTER_API_KEY is unset', () => {
    try {
      getProvider();
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BackendError);
      if (err instanceof BackendError) {
        expect(err.status).toBe(500);
        expect(err.code).toBe('INTERNAL');
        expect(err.message).toMatch(/OPENROUTER_API_KEY/);
      }
    }
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates the provider with the configured key when set', () => {
    (env as { OPENROUTER_API_KEY?: string }).OPENROUTER_API_KEY = 'sk-or-v1-abc';
    const fake = { id: 'openrouter' } as unknown as ReturnType<
      typeof createOpenRouter
    >;
    mockCreate.mockReturnValue(fake);
    const p = getProvider();
    expect(mockCreate).toHaveBeenCalledWith({ apiKey: 'sk-or-v1-abc' });
    expect(p).toBe(fake);
  });

  it('caches the provider across calls (singleton)', () => {
    (env as { OPENROUTER_API_KEY?: string }).OPENROUTER_API_KEY = 'sk-or-v1-abc';
    const fake = { id: 'openrouter' } as unknown as ReturnType<
      typeof createOpenRouter
    >;
    mockCreate.mockReturnValue(fake);
    const a = getProvider();
    const b = getProvider();
    expect(a).toBe(b);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

describe('resetProvider', () => {
  it('clears the cache so the next call recreates the provider', () => {
    (env as { OPENROUTER_API_KEY?: string }).OPENROUTER_API_KEY = 'sk-or-v1-abc';
    const first = { id: 'first' } as unknown as ReturnType<
      typeof createOpenRouter
    >;
    const second = { id: 'second' } as unknown as ReturnType<
      typeof createOpenRouter
    >;
    mockCreate.mockReturnValueOnce(first).mockReturnValueOnce(second);

    expect(getProvider()).toBe(first);
    resetProvider();
    expect(getProvider()).toBe(second);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});
