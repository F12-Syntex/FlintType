import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({
    userId: null,
    sessionClaims: null,
    has: () => false,
  })),
}));

import { auth } from '@clerk/nextjs/server';
import { POST } from './route';

const mockAuth = vi.mocked(auth);

type AuthReturn = Awaited<ReturnType<typeof auth>>;

function req(path: string[], body?: unknown) {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  return new NextRequest(`http://localhost/api/${path.join('/')}`, init);
}

const params = <T>(value: T) => ({ params: Promise.resolve(value) });

beforeEach(() => {
  mockAuth.mockReset();
  mockAuth.mockResolvedValue({
    userId: null,
    sessionClaims: null,
    has: () => false,
  } as unknown as AuthReturn);
});

describe('dispatcher — /api/[...path]', () => {
  it('routes a known path and serializes the handler return', async () => {
    const res = await POST(
      req(['health', 'ping']),
      params({ path: ['health', 'ping'] }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: true; ts: number };
    expect(body.ok).toBe(true);
    expect(typeof body.ts).toBe('number');
  });

  it('returns 404 NOT_FOUND for an unknown route', async () => {
    const res = await POST(
      req(['ghost', 'route']),
      params({ path: ['ghost', 'route'] }),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('returns 400 VALIDATION on invalid JSON body', async () => {
    const bad = new NextRequest('http://localhost/api/health/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not valid json',
    });
    const res = await POST(bad, params({ path: ['health', 'ping'] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'VALIDATION' });
  });

  it('handles empty body for void-input routes', async () => {
    const plain = new NextRequest('http://localhost/api/health/ping', {
      method: 'POST',
    });
    const res = await POST(plain, params({ path: ['health', 'ping'] }));
    expect(res.status).toBe(200);
  });
});
