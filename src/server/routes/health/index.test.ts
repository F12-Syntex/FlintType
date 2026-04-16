import { describe, expect, it } from 'vitest';
import { callRoute } from '@/server/testing';
import type { PingResponse } from '@/types/health';

describe('health.ping', () => {
  it('returns ok=true with a numeric timestamp', async () => {
    const out = await callRoute<PingResponse>(['health', 'ping']);
    expect(out.ok).toBe(true);
    expect(typeof out.ts).toBe('number');
    expect(out.ts).toBeGreaterThan(0);
  });
});
