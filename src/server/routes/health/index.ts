import { defineNamespace, defineRoute } from '@/server';
import { rateLimit } from '@/server/middleware/rate-limit';
import type { PingResponse } from '@/types/health';

const ping = defineRoute<void, PingResponse>({
  handler: () => ({ ok: true, ts: Date.now() }),
});

/** Public health namespace — no auth, anyone can ping. The route is
 *  cheap so the rate limit is generous (300/min per IP); it exists
 *  purely so a scripted scanner can't push the global request budget
 *  with millions of /health/ping calls. */
export const health = defineNamespace({
  middleware: [rateLimit({ limit: 300, windowMs: 60_000 })],
  routes: { ping },
});
