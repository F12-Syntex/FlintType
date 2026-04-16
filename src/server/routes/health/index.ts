import { defineNamespace, defineRoute } from '@/server';
import type { PingResponse } from '@/types/health';

const ping = defineRoute<void, PingResponse>({
  handler: () => ({ ok: true, ts: Date.now() }),
});

export const health = defineNamespace({
  routes: { ping },
});
