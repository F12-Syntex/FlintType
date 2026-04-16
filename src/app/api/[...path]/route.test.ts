import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
  clerkClient: vi.fn(async () => ({
    users: {
      getUserList: vi.fn(async () => ({ data: [], totalCount: 0 })),
      getUser: vi.fn(async () => {
        throw new Error('Not Found');
      }),
    },
  })),
}));

import { auth, clerkClient } from '@clerk/nextjs/server';
import { POST } from './route';

const mockAuth = vi.mocked(auth);
const mockClerkClient = vi.mocked(clerkClient);

type AuthReturn = Awaited<ReturnType<typeof auth>>;
type ClientReturn = Awaited<ReturnType<typeof clerkClient>>;

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
  mockClerkClient.mockReset();
  mockAuth.mockResolvedValue({
    userId: null,
    sessionClaims: null,
  } as unknown as AuthReturn);
  mockClerkClient.mockResolvedValue({
    users: {
      getUserList: vi.fn(async () => ({ data: [], totalCount: 0 })),
      getUser: vi.fn(async () => {
        throw new Error('Not Found');
      }),
    },
  } as unknown as ClientReturn);
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
    const bad = new NextRequest('http://localhost/api/echo/say', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ not valid json',
    });
    const res = await POST(bad, params({ path: ['echo', 'say'] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'VALIDATION' });
  });

  it('maps ZodError from input validation to 400 VALIDATION with issues', async () => {
    const res = await POST(
      req(['echo', 'say'], { message: 42 }),
      params({ path: ['echo', 'say'] }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION');
    expect(body.details).toHaveProperty('issues');
    expect(Array.isArray(body.details.issues)).toBe(true);
  });

  it('maps BackendError from a handler to its status/code', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_1',
      sessionClaims: { metadata: { role: 'admin' } },
    } as unknown as AuthReturn);
    // default mockClerkClient (empty list, getUser always throws) will make
    // users.get throw NOT_FOUND for any id
    const res = await POST(
      req(['users', 'get'], { id: 'nope' }),
      params({ path: ['users', 'get'] }),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toMatchObject({ code: 'NOT_FOUND', status: 404 });
  });

  it('maps UNAUTHORIZED from middleware to 401', async () => {
    const res = await POST(
      req(['users', 'list']),
      params({ path: ['users', 'list'] }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('handles empty body for void-input routes', async () => {
    const plain = new NextRequest('http://localhost/api/health/ping', {
      method: 'POST',
    });
    const res = await POST(plain, params({ path: ['health', 'ping'] }));
    expect(res.status).toBe(200);
  });
});
