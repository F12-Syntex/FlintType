import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { BackendError } from '@/lib/errors';

/** Mocked env shape — overwritten per test so we can flip the
 *  authority/proxy mode at runtime. Real env.ts parses
 *  process.env at module load, which is too late for these tests. */
vi.mock('@/server/env', () => ({
  env: {
    APP_ENV: 'development',
    DATABASE_MODE: 'auto' as 'auto' | 'neon' | 'pglite',
    DATABASE_URL: undefined as string | undefined,
    PGLITE_DATA_DIR: './.data/pglite',
    RACE_AUTHORITY: 'true' as 'true' | 'false',
    RACE_SERVICE_URL: undefined as string | undefined,
    RACE_PROXY_SECRET: undefined as string | undefined,
    NEXT_PUBLIC_RACE_SERVICE_URL: undefined as string | undefined,
  },
  IS_DEV: true,
  IS_PROD: false,
  IS_TEST: true,
  IS_RACE_AUTHORITY: true,
  logEnabled: () => false,
  logLevel: () => 'debug' as const,
}));

import * as envMod from '@/server/env';
import {
  proxyToRaceAuthority,
  raceHandler,
  requireRaceProxySecret,
  RACE_PROXY_SECRET_HEADER,
} from './proxy';
import type { RouteContext } from '@/server/types';

type MutableEnv = {
  RACE_AUTHORITY: 'true' | 'false';
  RACE_SERVICE_URL: string | undefined;
  RACE_PROXY_SECRET: string | undefined;
};

function setEnv(patch: Partial<MutableEnv> & { IS_RACE_AUTHORITY?: boolean }) {
  const m = envMod.env as unknown as MutableEnv;
  if ('RACE_AUTHORITY' in patch) m.RACE_AUTHORITY = patch.RACE_AUTHORITY!;
  if ('RACE_SERVICE_URL' in patch) m.RACE_SERVICE_URL = patch.RACE_SERVICE_URL;
  if ('RACE_PROXY_SECRET' in patch) m.RACE_PROXY_SECRET = patch.RACE_PROXY_SECRET;
  if ('IS_RACE_AUTHORITY' in patch) {
    (envMod as unknown as { IS_RACE_AUTHORITY: boolean }).IS_RACE_AUTHORITY =
      patch.IS_RACE_AUTHORITY!;
  }
}

function makeCtx(overrides?: Partial<RouteContext>): RouteContext {
  const headers = new Headers();
  const req = {
    url: 'https://example.test/api/race/queue',
    headers,
  } as unknown as RouteContext['req'];
  return {
    input: { modeId: 'words' } as unknown,
    req,
    meta: {},
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as RouteContext['log'],
    db: {} as RouteContext['db'],
    ...overrides,
  };
}

const ORIGINAL_FETCH = globalThis.fetch;

beforeEach(() => {
  setEnv({
    RACE_AUTHORITY: 'true',
    RACE_SERVICE_URL: undefined,
    RACE_PROXY_SECRET: undefined,
    IS_RACE_AUTHORITY: true,
  });
});

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH;
});

describe('proxyToRaceAuthority', () => {
  it('throws INTERNAL when RACE_SERVICE_URL is unset', async () => {
    setEnv({ RACE_AUTHORITY: 'false', IS_RACE_AUTHORITY: false });
    await expect(proxyToRaceAuthority(makeCtx())).rejects.toMatchObject({
      status: 500,
      code: 'INTERNAL',
    });
  });

  it('forwards POST to <RACE_SERVICE_URL><pathname> with secret + x-forwarded-for', async () => {
    setEnv({
      RACE_AUTHORITY: 'false',
      IS_RACE_AUTHORITY: false,
      RACE_SERVICE_URL: 'https://race.example.test/',
      RACE_PROXY_SECRET: 's3cret',
    });
    const fetchSpy = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ roomId: 'r_x' }), { status: 200 }),
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const ctx = makeCtx();
    ctx.req.headers.set('x-forwarded-for', '203.0.113.7, 10.0.0.1');

    const out = await proxyToRaceAuthority<{ roomId: string }>(ctx);
    expect(out).toEqual({ roomId: 'r_x' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const call = fetchSpy.mock.calls[0]!;
    const [url, init] = call;
    expect(url).toBe('https://race.example.test/api/race/queue');
    const headers = init!.headers as Record<string, string>;
    expect(headers[RACE_PROXY_SECRET_HEADER]).toBe('s3cret');
    expect(headers['x-forwarded-for']).toBe('203.0.113.7, 10.0.0.1');
    expect(init!.body).toBe(JSON.stringify({ modeId: 'words' }));
  });

  it('reconstructs BackendError from upstream non-2xx', async () => {
    setEnv({
      RACE_AUTHORITY: 'false',
      IS_RACE_AUTHORITY: false,
      RACE_SERVICE_URL: 'https://race.example.test',
    });
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          error: 'race room not found',
          code: 'NOT_FOUND',
          status: 404,
          details: { id: 'r_99' },
        }),
        { status: 404 },
      )) as unknown as typeof fetch;
    await expect(proxyToRaceAuthority(makeCtx())).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      message: 'race room not found',
      details: { id: 'r_99' },
    });
  });

  it('returns 502 when upstream unreachable', async () => {
    setEnv({
      RACE_AUTHORITY: 'false',
      IS_RACE_AUTHORITY: false,
      RACE_SERVICE_URL: 'https://race.example.test',
    });
    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    await expect(proxyToRaceAuthority(makeCtx())).rejects.toMatchObject({
      status: 502,
      code: 'INTERNAL',
    });
  });
});

describe('raceHandler', () => {
  it('calls the local fn on authority', async () => {
    setEnv({ IS_RACE_AUTHORITY: true });
    const local = vi.fn(async () => ({ ok: true }));
    const wrapped = raceHandler(local);
    const result = await wrapped(makeCtx());
    expect(result).toEqual({ ok: true });
    expect(local).toHaveBeenCalledOnce();
  });

  it('proxies off-authority', async () => {
    setEnv({
      RACE_AUTHORITY: 'false',
      IS_RACE_AUTHORITY: false,
      RACE_SERVICE_URL: 'https://race.example.test',
    });
    const local = vi.fn(async () => ({ ok: true }));
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ ok: false }), { status: 200 })) as unknown as typeof fetch;

    const wrapped = raceHandler(local);
    const result = await wrapped(makeCtx());
    expect(result).toEqual({ ok: false });
    expect(local).not.toHaveBeenCalled();
  });
});

describe('requireRaceProxySecret', () => {
  it('passes through on non-authority instance', async () => {
    setEnv({ IS_RACE_AUTHORITY: false });
    const next = vi.fn(async () => 'ok');
    const out = await requireRaceProxySecret(makeCtx(), next);
    expect(next).toHaveBeenCalledOnce();
    expect(out).toBe('ok');
  });

  it('passes through on authority when no secret configured (local dev)', async () => {
    setEnv({ IS_RACE_AUTHORITY: true, RACE_PROXY_SECRET: undefined });
    const next = vi.fn(async () => 'ok');
    await requireRaceProxySecret(makeCtx(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('passes through on authority with matching secret', async () => {
    setEnv({ IS_RACE_AUTHORITY: true, RACE_PROXY_SECRET: 's3cret' });
    const ctx = makeCtx();
    ctx.req.headers.set(RACE_PROXY_SECRET_HEADER, 's3cret');
    const next = vi.fn(async () => 'ok');
    await requireRaceProxySecret(ctx, next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('throws UNAUTHORIZED on authority with mismatched secret', async () => {
    setEnv({ IS_RACE_AUTHORITY: true, RACE_PROXY_SECRET: 's3cret' });
    const ctx = makeCtx();
    ctx.req.headers.set(RACE_PROXY_SECRET_HEADER, 'wrong');
    const next = vi.fn();
    await expect(requireRaceProxySecret(ctx, next)).rejects.toBeInstanceOf(
      BackendError,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('throws UNAUTHORIZED on authority with missing secret header', async () => {
    setEnv({ IS_RACE_AUTHORITY: true, RACE_PROXY_SECRET: 's3cret' });
    const next = vi.fn();
    await expect(requireRaceProxySecret(makeCtx(), next)).rejects.toMatchObject(
      { status: 401, code: 'UNAUTHORIZED' },
    );
  });
});
