import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { BackendError } from '../errors';
import { runRoute } from '../pipeline';
import { echo } from './echo';

const req = () =>
  new NextRequest('http://localhost/api/echo/say', { method: 'POST' });

describe('echo.say', () => {
  it('echoes the message with its length', async () => {
    const out = await runRoute(echo.say, {
      input: { message: 'hello' },
      req: req(),
    });
    expect(out).toEqual({ echoed: 'hello', length: 5 });
  });

  it('rejects missing message with BackendError(400)', async () => {
    await expect(
      runRoute(echo.say, { input: {}, req: req() }),
    ).rejects.toBeInstanceOf(BackendError);
  });

  it('rejects non-string message', async () => {
    await expect(
      runRoute(echo.say, { input: { message: 42 }, req: req() }),
    ).rejects.toThrow(/string/);
  });
});
