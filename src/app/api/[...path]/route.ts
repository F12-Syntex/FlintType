import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { BackendError } from '@/server/errors';
import { runRoute } from '@/server/pipeline';
import { resolvePath } from '@/server/resolve';
import { router } from '@/server/router';

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
  const resolved = resolvePath(router, path);
  if (!resolved) {
    return errorJson(404, 'NOT_FOUND', `Unknown route /${path.join('/')}`);
  }

  let input: unknown = undefined;
  const raw = await req.text();
  if (raw.length > 0) {
    try {
      input = JSON.parse(raw);
    } catch {
      return errorJson(400, 'VALIDATION', 'Invalid JSON body');
    }
  }

  try {
    const result = await runRoute(
      resolved.route,
      { input, req },
      resolved.middleware,
    );
    return NextResponse.json(result);
  } catch (err) {
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
    console.error(err);
    return errorJson(500, 'INTERNAL', 'Internal error');
  }
}
