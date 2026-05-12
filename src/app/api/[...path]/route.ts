import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { BackendError } from '@/lib/errors';
import { logger } from '@/server/logger';
import { runRoute } from '@/server/pipeline';
import { resolvePath } from '@/server/resolve';
import { router } from '@/server/router';

/** Pin the dispatcher to a single Vercel region. The race-room
 *  registry (src/server/race/store.ts) is in-memory only — when a
 *  POST /api/race/queue lands in one region and the follow-up
 *  GET /api/race/stream/<id> lands in another, the second region
 *  has never seen the room and 404s. Until we move the store to
 *  Redis/KV, every race-related request must land on the same
 *  function pool, which means the same region.
 *
 *  iad1 (US East) is the lowest-latency Vercel default for the
 *  Neon/Clerk endpoints we rely on; users in other regions take
 *  one extra round-trip but get a working race. */
export const preferredRegion = 'iad1';

function errorJson(
  status: number,
  code: BackendError['code'],
  message: string,
  details?: Record<string, unknown>,
) {
  return NextResponse.json(
    { error: message, code, status, ...(details ? { details } : {}) },
    { status },
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const requestId = randomUUID();
  const pathStr = `/${path.join('/')}`;
  const requestLog = logger.child({
    requestId,
    method: req.method,
    path: pathStr,
  });

  const resolved = resolvePath(router, path);
  if (!resolved) {
    requestLog.warn('route not found');
    return errorJson(404, 'NOT_FOUND', `Unknown route ${pathStr}`);
  }

  let input: unknown = undefined;
  const raw = await req.text();
  if (raw.length > 0) {
    try {
      input = JSON.parse(raw);
    } catch {
      requestLog.warn('invalid json body');
      return errorJson(400, 'VALIDATION', 'Invalid JSON body');
    }
  }

  try {
    const result = await runRoute(
      resolved.route,
      { input, req, meta: { requestId }, log: requestLog },
      resolved.middleware,
    );
    return NextResponse.json(result);
  } catch (err) {
    // logging middleware already recorded the failure; only shape the response here
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return errorJson(
        400,
        'VALIDATION',
        first?.message ?? 'Validation failed',
        { issues: err.issues },
      );
    }
    if (err instanceof BackendError) {
      return NextResponse.json(err.toJSON(), { status: err.status });
    }
    requestLog.error('dispatcher fallback', err);
    return errorJson(500, 'INTERNAL', 'Internal error');
  }
}
