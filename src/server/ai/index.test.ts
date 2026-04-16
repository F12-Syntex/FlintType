import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendError } from '@/lib/errors';

vi.mock('@/server/env', () => ({
  env: {
    APP_ENV: 'development',
    SITE_URL: 'http://localhost:3000',
    DATABASE_MODE: 'pglite',
    PGLITE_DATA_DIR: './.data/pglite',
    OPENROUTER_API_KEY: undefined as string | undefined,
  },
  IS_DEV: true,
  IS_PROD: false,
  IS_TEST: true,
  logEnabled: () => false,
  logLevel: () => 'debug' as const,
}));

vi.mock('ai', async () => {
  const actual = await vi.importActual<typeof import('ai')>('ai');
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

import { generateText } from 'ai';
import { env } from '@/server/env';
import { ai, generateChat, PRESETS } from './index';
import { resetProvider } from './provider';

const mockGenerateText = vi.mocked(generateText);

beforeEach(() => {
  mockGenerateText.mockReset();
  resetProvider();
  (env as { OPENROUTER_API_KEY?: string }).OPENROUTER_API_KEY = undefined;
});

describe('ai presets', () => {
  it('exposes fast / smart / cheap', () => {
    expect(Object.keys(ai).sort()).toEqual(['cheap', 'fast', 'smart']);
  });
});

describe('ai.<preset>() without API key', () => {
  it('throws BackendError(500, INTERNAL) explaining the missing env', () => {
    try {
      ai.fast();
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BackendError);
      if (err instanceof BackendError) {
        expect(err.status).toBe(500);
        expect(err.code).toBe('INTERNAL');
        expect(err.message).toMatch(/OPENROUTER_API_KEY/);
      }
    }
  });
});

describe('generateChat', () => {
  beforeEach(() => {
    (env as { OPENROUTER_API_KEY?: string }).OPENROUTER_API_KEY = 'sk-test';
  });

  it('returns text, preset, model, and normalized usage', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'hello world',
      usage: {
        inputTokens: 12,
        outputTokens: 3,
        totalTokens: 15,
      },
      providerMetadata: {
        openrouter: { usage: { cost: 0.000123 } },
      },
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    const out = await generateChat({ preset: 'smart', prompt: 'hi' });
    expect(out.text).toBe('hello world');
    expect(out.preset).toBe('smart');
    expect(out.model).toBe(PRESETS.smart);
    expect(out.usage).toEqual({
      inputTokens: 12,
      outputTokens: 3,
      totalTokens: 15,
      totalCostUsd: 0.000123,
    });
  });

  it('normalizes missing token counts to null', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'x',
      usage: {
        inputTokens: undefined,
        outputTokens: undefined,
        totalTokens: undefined,
      },
      providerMetadata: undefined,
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    const out = await generateChat({ preset: 'fast', prompt: 'hi' });
    expect(out.usage).toEqual({
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      totalCostUsd: null,
    });
  });

  it('parses a string cost from providerMetadata', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'x',
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      providerMetadata: {
        openrouter: { usage: { cost: '0.000045' } },
      },
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    const out = await generateChat({ preset: 'cheap', prompt: 'hi' });
    expect(out.usage.totalCostUsd).toBeCloseTo(0.000045);
  });

  it('falls back to null when cost is non-numeric', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'x',
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      providerMetadata: {
        openrouter: { usage: { cost: 'free' } },
      },
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    const out = await generateChat({ preset: 'fast', prompt: 'hi' });
    expect(out.usage.totalCostUsd).toBeNull();
  });

  it('passes the preset-resolved model to generateText', async () => {
    mockGenerateText.mockResolvedValue({
      text: 'x',
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      providerMetadata: undefined,
    } as unknown as Awaited<ReturnType<typeof generateText>>);

    await generateChat({ preset: 'fast', prompt: 'ping' });
    expect(mockGenerateText).toHaveBeenCalledOnce();
    const args = mockGenerateText.mock.calls[0]?.[0];
    expect(args?.prompt).toBe('ping');
  });
});
