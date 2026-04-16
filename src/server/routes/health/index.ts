import { defineNamespace, defineRoute } from '@/server';

export type PingResponse = { ok: true; ts: number };

export const health = defineNamespace({
  routes: {
    ping: defineRoute<void, PingResponse>({
      handler: () => ({ ok: true, ts: Date.now() }),
    }),
  },
});
