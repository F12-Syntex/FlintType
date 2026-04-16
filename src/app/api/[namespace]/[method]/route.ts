import { NextRequest, NextResponse } from 'next/server';
import { BackendError } from '@/server/errors';
import { runRoute } from '@/server/pipeline';
import { globalMiddleware, router } from '@/server/router';
import type { RouteDef } from '@/server/types';

type RouterMap = Record<string, Record<string, RouteDef>>;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ namespace: string; method: string }> },
) {
  const { namespace, method } = await params;
  const ns = (router as unknown as RouterMap)[namespace];
  const route = ns?.[method];
  if (!route) {
    return NextResponse.json(
      { error: `Unknown route ${namespace}.${method}` },
      { status: 404 },
    );
  }

  let input: unknown = undefined;
  const raw = await req.text();
  if (raw.length > 0) {
    try {
      input = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }
  }

  try {
    const result = await runRoute(route, { input, req }, globalMiddleware);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof BackendError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
