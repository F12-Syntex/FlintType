import { defineNamespace, defineRoute } from '@/server';
import { rateLimit } from '@/server/middleware/rate-limit';
import type { RateLimitPingOutput } from '@/types/ratelimit';

const LIMIT = 5;
const WINDOW_MS = 10_000;

/**
 * Dashboard-testable rate-limit demo. Unauthenticated on purpose so the
 * bucket falls back to IP keying — mash the button on `/` and watch the
 * 429 arrive after 5 requests within 10 seconds.
 */
const ping = defineRoute<void, RateLimitPingOutput>({
  middleware: [rateLimit({ limit: LIMIT, windowMs: WINDOW_MS })],
  handler: () => ({
    ok: true,
    ts: Date.now(),
    limit: LIMIT,
    windowMs: WINDOW_MS,
  }),
});

export const ratelimit = defineNamespace({
  routes: { ping },
});
