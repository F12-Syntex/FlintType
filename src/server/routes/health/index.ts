import { defineNamespace, defineRoute } from '@/server';
import type { PingResponse } from '@/types/health';

export const health = defineNamespace({
  routes: {
    ping: defineRoute<void, PingResponse>({
      handler: () => ({ ok: true, ts: Date.now() }),
    }),
  },
});
