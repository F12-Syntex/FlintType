import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { runRoute } from '../pipeline';
import { health } from './health';

const req = () =>
  new NextRequest('http://localhost/api/health/ping', { method: 'POST' });

describe('health.ping', () => {
  it('returns ok=true with a numeric timestamp', async () => {
    const out = await runRoute(health.ping, { input: undefined, req: req() });
    expect(out.ok).toBe(true);
    expect(typeof out.ts).toBe('number');
    expect(out.ts).toBeGreaterThan(0);
  });
});
