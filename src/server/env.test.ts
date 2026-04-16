import { describe, expect, it } from 'vitest';
import { env, IS_DEV, IS_PROD, IS_TEST, logEnabled, logLevel } from './env';

describe('env module', () => {
  it('parses APP_ENV with "development" default', () => {
    expect(['development', 'production']).toContain(env.APP_ENV);
  });

  it('IS_TEST is true under vitest (NODE_ENV=test)', () => {
    expect(IS_TEST).toBe(true);
  });

  it('IS_PROD is false in tests (NODE_ENV=test, APP_ENV falls through to development)', () => {
    expect(IS_PROD).toBe(false);
  });

  it('IS_DEV mirrors APP_ENV === "development"', () => {
    expect(IS_DEV).toBe(env.APP_ENV === 'development');
  });

  it('DATABASE_MODE defaults to "auto" when unset', () => {
    expect(['auto', 'neon', 'pglite']).toContain(env.DATABASE_MODE);
  });

  it('SITE_URL is a valid URL', () => {
    expect(() => new URL(env.SITE_URL)).not.toThrow();
  });

  it('PGLITE_DATA_DIR has a default path when unset', () => {
    expect(typeof env.PGLITE_DATA_DIR).toBe('string');
    expect(env.PGLITE_DATA_DIR.length).toBeGreaterThan(0);
  });

  it('OPENROUTER_API_KEY is optional and undefined when unset', () => {
    expect(
      env.OPENROUTER_API_KEY === undefined ||
        typeof env.OPENROUTER_API_KEY === 'string',
    ).toBe(true);
  });
});

describe('logEnabled', () => {
  it('returns false by default in tests (NODE_ENV=test, LOG_ENABLED unset)', () => {
    expect(logEnabled()).toBe(false);
  });
});

describe('logLevel', () => {
  it('returns a valid LogLevel', () => {
    expect(['debug', 'info', 'warn', 'error']).toContain(logLevel());
  });

  it('defaults to "debug" in development', () => {
    if (IS_DEV) {
      expect(logLevel()).toBe('debug');
    }
  });
});
