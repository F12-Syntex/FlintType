import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { callRoute } from '@/server/testing';
import type { SayOutput } from './index';

describe('echo.say', () => {
  it('echoes the message with its length', async () => {
    const out = await callRoute<SayOutput>(['echo', 'say'], {
      input: { message: 'hello' },
    });
    expect(out).toEqual({ echoed: 'hello', length: 5 });
  });

  it('rejects missing message with a ZodError', async () => {
    await expect(
      callRoute(['echo', 'say'], { input: {} }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it('rejects non-string message', async () => {
    await expect(
      callRoute(['echo', 'say'], { input: { message: 42 } }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it('rejects empty message (min(1) constraint)', async () => {
    await expect(
      callRoute(['echo', 'say'], { input: { message: '' } }),
    ).rejects.toBeInstanceOf(ZodError);
  });
});
