import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendError, setBackendHeaders, useBackend } from './backend';

interface ClientNode {
  (input?: unknown): Promise<unknown>;
  [key: string]: ClientNode;
}

function okResponse(body: unknown) {
  return new Response(body === null ? '' : JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function failResponse(status: number, body: string) {
  return new Response(body, { status });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
  setBackendHeaders(() => ({}));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useBackend proxy', () => {
  it('posts to /api/<path> with a JSON body when input is provided', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({ id: 'p_1' }));
    const client = useBackend() as unknown as ClientNode;
    const out = await client.posts.get({ id: 'p_1' });
    expect(out).toEqual({ id: 'p_1' });
    expect(fetch).toHaveBeenCalledWith('/api/posts/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'p_1' }),
    });
  });

  it('posts with an empty body when invoked without arguments', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([]));
    const client = useBackend() as unknown as ClientNode;
    await client.posts.list();
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.body).toBe('');
  });

  it('returns null when the response body is empty', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }));
    const client = useBackend() as unknown as ClientNode;
    expect(await client.widgets.noop()).toBeNull();
  });

  it('builds deeply nested URLs from chained property access', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse([]));
    const client = useBackend() as unknown as ClientNode;
    await client.users.admins.list();
    expect(fetch).toHaveBeenCalledWith(
      '/api/users/admins/list',
      expect.anything(),
    );
  });

  it('short-circuits property access for "then" so the proxy is not thenable', () => {
    const client = useBackend() as unknown as ClientNode;
    expect(client.then).toBeUndefined();
    expect(client.posts.then).toBeUndefined();
  });

  it('returns undefined for symbol property access', () => {
    const client = useBackend() as unknown as {
      [k: symbol]: unknown;
    };
    expect(client[Symbol.iterator]).toBeUndefined();
  });
});

describe('error path', () => {
  it('rebuilds BackendError with status, code, message, and details', async () => {
    const payload = {
      error: 'user u_9 not found',
      code: 'NOT_FOUND',
      status: 404,
      details: { id: 'u_9' },
    };
    vi.mocked(fetch).mockResolvedValue(
      failResponse(404, JSON.stringify(payload)),
    );
    const client = useBackend() as unknown as ClientNode;
    const err: unknown = await client.users
      .get({ id: 'u_9' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BackendError);
    const be = err as BackendError;
    expect(be.status).toBe(404);
    expect(be.code).toBe('NOT_FOUND');
    expect(be.message).toBe('user u_9 not found');
    expect(be.details).toEqual({ id: 'u_9' });
  });

  it('defaults code to INTERNAL when the server omits it', async () => {
    vi.mocked(fetch).mockResolvedValue(
      failResponse(500, JSON.stringify({ error: 'kaboom' })),
    );
    const client = useBackend() as unknown as ClientNode;
    const err = (await client.health
      .ping()
      .catch((e: unknown) => e)) as BackendError;
    expect(err.code).toBe('INTERNAL');
    expect(err.message).toBe('kaboom');
    expect(err.details).toBeUndefined();
  });

  it('synthesizes a message when the error body is empty', async () => {
    vi.mocked(fetch).mockResolvedValue(failResponse(503, ''));
    const client = useBackend() as unknown as ClientNode;
    const err = (await client.health
      .ping()
      .catch((e: unknown) => e)) as BackendError;
    expect(err.status).toBe(503);
    expect(err.code).toBe('INTERNAL');
    expect(err.message).toBe('Request failed: 503');
  });
});

describe('setBackendHeaders', () => {
  it("merges the provider's headers into every call", async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse({}));
    setBackendHeaders(() => ({
      'x-tenant-id': 'acme',
      'x-trace-id': 'trace_9',
    }));
    const client = useBackend() as unknown as ClientNode;
    await client.a.b();
    expect(fetch).toHaveBeenCalledWith(
      '/api/a/b',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'acme',
          'x-trace-id': 'trace_9',
        },
      }),
    );
  });

  it('reads the provider on every request so dynamic state is reflected', async () => {
    vi.mocked(fetch).mockImplementation(async () => okResponse({}));
    let tenant = 't1';
    setBackendHeaders(() => ({ 'x-tenant-id': tenant }));
    const client = useBackend() as unknown as ClientNode;
    await client.a();
    tenant = 't2';
    await client.a();
    const first = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const second = vi.mocked(fetch).mock.calls[1][1] as RequestInit;
    expect((first.headers as Record<string, string>)['x-tenant-id']).toBe(
      't1',
    );
    expect((second.headers as Record<string, string>)['x-tenant-id']).toBe(
      't2',
    );
  });
});
