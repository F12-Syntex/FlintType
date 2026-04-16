'use client';

import type { Router } from '@/server/router';
import type { RouteDef } from '@/server/types';

type Methods<NS> = {
  [M in keyof NS]: NS[M] extends RouteDef<infer I, infer O>
    ? void extends I
      ? () => Promise<O>
      : (input: I) => Promise<O>
    : never;
};

export type BackendClient = { [N in keyof Router]: Methods<Router[N]> };

async function call(namespace: string, method: string, input: unknown) {
  const res = await fetch(`/api/${namespace}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: input === undefined ? '' : JSON.stringify(input),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new Error(data?.error ?? `Request failed: ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data;
}

const client = new Proxy(
  {},
  {
    get(_target, namespace: string) {
      return new Proxy(
        {},
        {
          get(_ns, method: string) {
            return (input?: unknown) => call(namespace, method, input);
          },
        },
      );
    },
  },
) as BackendClient;

export function useBackend(): BackendClient {
  return client;
}
