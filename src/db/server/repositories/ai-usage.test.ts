import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { PRESETS } from '@/server/ai/presets';
import { createTestDatabase } from '../testing';

const { db, reset, close } = await createTestDatabase();
const { aiUsage } = db;

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await close();
});

function sample(overrides: Partial<Parameters<typeof aiUsage.log>[0]> = {}) {
  return {
    userId: 'user_1',
    preset: 'fast',
    model: PRESETS.fast,
    inputTokens: 10,
    outputTokens: 5,
    totalTokens: 15,
    totalCostUsd: 0.0001,
    ...overrides,
  };
}

describe('aiUsageRepo.log', () => {
  it('assigns an id and createdAt', async () => {
    const row = await aiUsage.log(sample());
    expect(row.id).toMatch(/^[0-9a-f-]+$/);
    expect(row.createdAt).toBeInstanceOf(Date);
  });

  it('persists preset + model + token counts + cost', async () => {
    const row = await aiUsage.log(
      sample({
        preset: 'smart',
        model: PRESETS.smart,
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
        totalCostUsd: 0.0042,
      }),
    );
    expect(row.preset).toBe('smart');
    expect(row.model).toBe(PRESETS.smart);
    expect(row.inputTokens).toBe(100);
    expect(row.outputTokens).toBe(50);
    expect(row.totalTokens).toBe(150);
    expect(row.totalCostUsd).toBeCloseTo(0.0042);
  });

  it('accepts null token counts and null cost', async () => {
    const row = await aiUsage.log(
      sample({
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        totalCostUsd: null,
      }),
    );
    expect(row.inputTokens).toBeNull();
    expect(row.totalCostUsd).toBeNull();
  });
});

describe('aiUsageRepo.listByUser', () => {
  it('returns an empty array when the user has no rows', async () => {
    expect(await aiUsage.listByUser('ghost')).toEqual([]);
  });

  it('returns rows only for the requested user', async () => {
    await aiUsage.log(sample({ userId: 'user_1' }));
    await aiUsage.log(sample({ userId: 'user_2' }));
    const out = await aiUsage.listByUser('user_1');
    expect(out).toHaveLength(1);
    expect(out[0].userId).toBe('user_1');
  });

  it('orders by createdAt desc', async () => {
    const a = await aiUsage.log(sample({ preset: 'fast' }));
    await new Promise((r) => setTimeout(r, 5));
    const b = await aiUsage.log(sample({ preset: 'smart' }));
    const out = await aiUsage.listByUser('user_1');
    expect(out.map((r) => r.id)).toEqual([b.id, a.id]);
  });

  it('respects the limit option', async () => {
    await aiUsage.log(sample());
    await aiUsage.log(sample());
    await aiUsage.log(sample());
    expect(await aiUsage.listByUser('user_1', { limit: 2 })).toHaveLength(2);
  });
});
