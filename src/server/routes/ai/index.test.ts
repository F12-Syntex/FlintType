import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZodError } from 'zod';
import { BackendError } from '@/lib/errors';
import { createTestDatabase } from '@/db/server/testing';
import { PRESETS } from '@/server/ai/presets';
import { callRoute } from '@/server/testing';
import type { ChatOutput } from '@/types/ai';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: null, sessionClaims: null })),
}));

vi.mock('@/server/ai', async () => {
  const actual =
    await vi.importActual<typeof import('@/server/ai')>('@/server/ai');
  return {
    ...actual,
    generateChat: vi.fn(),
  };
});

import { auth } from '@clerk/nextjs/server';
import { generateChat } from '@/server/ai';

const mockAuth = vi.mocked(auth);
const mockGenerateChat = vi.mocked(generateChat);

type AuthReturn = Awaited<ReturnType<typeof auth>>;

function asUser(userId = 'user_1') {
  mockAuth.mockResolvedValue({
    userId,
    sessionClaims: null,
  } as unknown as AuthReturn);
}

function asAnon() {
  mockAuth.mockResolvedValue({
    userId: null,
    sessionClaims: null,
  } as unknown as AuthReturn);
}

const { db, reset, close } = await createTestDatabase();

beforeEach(async () => {
  mockAuth.mockReset();
  mockGenerateChat.mockReset();
  await reset();
});

afterAll(async () => {
  await close();
});

describe('ai.chat', () => {
  it('rejects unauthenticated callers before hitting the provider', async () => {
    asAnon();
    await expect(
      callRoute(['ai', 'chat'], {
        db,
        input: { preset: 'fast', prompt: 'hi' },
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError && e.code === 'UNAUTHORIZED',
    );
    expect(mockGenerateChat).not.toHaveBeenCalled();
  });

  it('rejects an unknown preset via Zod', async () => {
    asUser();
    await expect(
      callRoute(['ai', 'chat'], {
        db,
        input: { preset: 'galaxybrain', prompt: 'hi' },
      }),
    ).rejects.toBeInstanceOf(ZodError);
    expect(mockGenerateChat).not.toHaveBeenCalled();
  });

  it('rejects an empty prompt via Zod', async () => {
    asUser();
    await expect(
      callRoute(['ai', 'chat'], {
        db,
        input: { preset: 'fast', prompt: '' },
      }),
    ).rejects.toBeInstanceOf(ZodError);
  });

  it('returns the generated text + usage from the provider', async () => {
    asUser('user_42');
    mockGenerateChat.mockResolvedValue({
      text: 'hello there',
      preset: 'smart',
      model: PRESETS.smart,
      usage: {
        inputTokens: 7,
        outputTokens: 4,
        totalTokens: 11,
        totalCostUsd: 0.000042,
      },
    });

    const out = await callRoute<ChatOutput>(['ai', 'chat'], {
      db,
      input: { preset: 'smart', prompt: 'hi there' },
    });

    expect(out.text).toBe('hello there');
    expect(out.model).toBe(PRESETS.smart);
    expect(out.usage.totalTokens).toBe(11);
    expect(mockGenerateChat).toHaveBeenCalledOnce();
  });

  it('tolerates null usage fields from the provider', async () => {
    asUser('user_1');
    mockGenerateChat.mockResolvedValue({
      text: 'x',
      preset: 'fast',
      model: PRESETS.fast,
      usage: {
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        totalCostUsd: null,
      },
    });

    const out = await callRoute<ChatOutput>(['ai', 'chat'], {
      db,
      input: { preset: 'fast', prompt: 'hi' },
    });
    expect(out.text).toBe('x');
    expect(out.usage.totalCostUsd).toBeNull();
    expect(out.usage.inputTokens).toBeNull();
  });

  it('propagates provider errors as BackendError(INTERNAL)', async () => {
    asUser();
    mockGenerateChat.mockRejectedValue(
      new BackendError(
        500,
        'INTERNAL',
        'OPENROUTER_API_KEY not set',
      ),
    );
    await expect(
      callRoute(['ai', 'chat'], {
        db,
        input: { preset: 'fast', prompt: 'hi' },
      }),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError && e.code === 'INTERNAL',
    );
  });
});
