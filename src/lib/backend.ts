'use client';

import { BackendError, type ErrorCode } from '@/lib/errors';
import type { NamespaceDef, RouteDef } from '@/server/types';
import type { Router } from '@/server/router';

type Client<T> =
  T extends RouteDef<infer I, infer O>
    ? void extends I
      ? () => Promise<O>
      : (input: I) => Promise<O>
    : T extends NamespaceDef<infer R>
      ? { [K in keyof R]: Client<R[K]> }
      : never;

export type BackendClient = Client<Router>;

type HeaderProvider = () => Record<string, string>;
let headerProvider: HeaderProvider = () => ({});

export function setBackendHeaders(provider: HeaderProvider): void {
  headerProvider = provider;
}

async function call(path: readonly string[], input: unknown) {
  const res = await fetch(`/api/${path.join('/')}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headerProvider(),
    },
    body: input === undefined ? '' : JSON.stringify(input),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const code = (data?.code ?? 'INTERNAL') as ErrorCode;
    throw new BackendError(
      res.status,
      code,
      data?.error ?? `Request failed: ${res.status}`,
      data?.details,
    );
  }
  return data;
}

function createClient(path: readonly string[] = []): unknown {
  const target = (input?: unknown) => call(path, input);
  return new Proxy(target, {
    get(_t, prop) {
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'then') return undefined;
      return createClient([...path, prop]);
    },
  });
}

const client = createClient() as BackendClient;

export function useBackend(): BackendClient {
  return client;
}

export { BackendError };
export type { ErrorCode };
