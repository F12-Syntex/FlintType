import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/server/env', () => ({
  env: {
    APP_ENV: 'development',
    SITE_URL: 'http://localhost:3000',
    DATABASE_MODE: 'auto' as 'auto' | 'neon' | 'pglite',
    DATABASE_URL: undefined as string | undefined,
    PGLITE_DATA_DIR: './.data/pglite',
  },
  IS_DEV: true,
  IS_PROD: false,
  IS_TEST: true,
  logEnabled: () => false,
  logLevel: () => 'debug' as const,
}));

import * as envMod from '@/server/env';
import { createServerDrizzle, selectDriverMode } from './driver';

type MutableEnv = {
  DATABASE_MODE: 'auto' | 'neon' | 'pglite';
  DATABASE_URL: string | undefined;
};

function setEnv(patch: Partial<MutableEnv> & { IS_PROD?: boolean }) {
  const mutable = envMod.env as unknown as MutableEnv;
  if ('DATABASE_MODE' in patch) mutable.DATABASE_MODE = patch.DATABASE_MODE!;
  if ('DATABASE_URL' in patch) mutable.DATABASE_URL = patch.DATABASE_URL;
  if ('IS_PROD' in patch) {
    (envMod as { IS_PROD: boolean }).IS_PROD = patch.IS_PROD!;
  }
}

beforeEach(() => {
  setEnv({ DATABASE_MODE: 'auto', DATABASE_URL: undefined, IS_PROD: false });
});

describe('selectDriverMode', () => {
  it('returns "neon" when DATABASE_MODE is explicitly neon', () => {
    setEnv({ DATABASE_MODE: 'neon', DATABASE_URL: undefined });
    expect(selectDriverMode()).toBe('neon');
  });

  it('returns "pglite" when DATABASE_MODE is explicitly pglite', () => {
    setEnv({ DATABASE_MODE: 'pglite', DATABASE_URL: 'postgres://ignored' });
    expect(selectDriverMode()).toBe('pglite');
  });

  it('in auto mode with DATABASE_URL set, returns "neon"', () => {
    setEnv({
      DATABASE_MODE: 'auto',
      DATABASE_URL: 'postgres://user:pw@host/db',
    });
    expect(selectDriverMode()).toBe('neon');
  });

  it('in auto mode in production without DATABASE_URL, throws', () => {
    setEnv({
      DATABASE_MODE: 'auto',
      DATABASE_URL: undefined,
      IS_PROD: true,
    });
    expect(() => selectDriverMode()).toThrow(/DATABASE_URL is required/);
  });

  it('in auto mode in development without DATABASE_URL, falls back to pglite', () => {
    setEnv({
      DATABASE_MODE: 'auto',
      DATABASE_URL: undefined,
      IS_PROD: false,
    });
    expect(selectDriverMode()).toBe('pglite');
  });
});

describe('createServerDrizzle', () => {
  it('constructs a pglite drizzle instance in pglite mode', () => {
    setEnv({ DATABASE_MODE: 'pglite', DATABASE_URL: undefined });
    const drz = createServerDrizzle();
    expect(drz).toBeDefined();
    expect(typeof drz.select).toBe('function');
  });

  it('throws if neon mode is requested without DATABASE_URL', () => {
    setEnv({ DATABASE_MODE: 'neon', DATABASE_URL: undefined });
    expect(() => createServerDrizzle()).toThrow(
      /DATABASE_URL is required for neon driver mode/,
    );
  });
});
