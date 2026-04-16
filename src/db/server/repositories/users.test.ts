import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { ClerkUserLike } from '@/server/clerk-user';
import { createTestDatabase } from '../testing';

const { db, reset, close } = await createTestDatabase();
const { users } = db;

function clerkFixture(overrides: Partial<ClerkUserLike> = {}): ClerkUserLike {
  return {
    id: 'user_1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    imageUrl: 'https://img.clerk.com/ada',
    primaryEmailAddressId: 'e1',
    emailAddresses: [{ id: 'e1', emailAddress: 'ada@example.com' }],
    publicMetadata: {},
    ...overrides,
  };
}

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await close();
});

describe('usersRepo.findById', () => {
  it('returns null for an unknown id', async () => {
    expect(await users.findById('nope')).toBeNull();
  });

  it('returns the matching row', async () => {
    await users.upsertFromClerk(clerkFixture());
    const row = await users.findById('user_1');
    expect(row?.email).toBe('ada@example.com');
    expect(row?.name).toBe('Ada Lovelace');
  });
});

describe('usersRepo.upsertFromClerk', () => {
  it('inserts a new row with fields mapped via toUser', async () => {
    const row = await users.upsertFromClerk(clerkFixture());
    expect(row.id).toBe('user_1');
    expect(row.role).toBe('user');
    expect(row.imageUrl).toBe('https://img.clerk.com/ada');
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.updatedAt).toBeInstanceOf(Date);
  });

  it('updates an existing row on conflict and bumps updatedAt', async () => {
    const first = await users.upsertFromClerk(clerkFixture());
    await new Promise((r) => setTimeout(r, 5));
    const second = await users.upsertFromClerk(
      clerkFixture({
        firstName: 'Augusta',
        publicMetadata: { role: 'admin' },
      }),
    );
    expect(second.id).toBe(first.id);
    expect(second.name).toBe('Augusta Lovelace');
    expect(second.role).toBe('admin');
    expect(second.updatedAt.getTime()).toBeGreaterThan(
      first.updatedAt.getTime(),
    );
    expect(second.createdAt.getTime()).toBe(first.createdAt.getTime());
  });
});

describe('usersRepo.removeById', () => {
  it('removes an existing row and returns true', async () => {
    await users.upsertFromClerk(clerkFixture());
    expect(await users.removeById('user_1')).toBe(true);
    expect(await users.findById('user_1')).toBeNull();
  });

  it('returns false for an unknown id', async () => {
    expect(await users.removeById('nope')).toBe(false);
  });
});
