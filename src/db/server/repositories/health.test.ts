import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { ClerkUserLike } from '@/server/clerk-user';
import { createTestDatabase } from '../testing';
import { BackendError } from '@/lib/errors';

const testDb = await createTestDatabase();

function clerkFixture(id: string): ClerkUserLike {
  return {
    id,
    firstName: id,
    lastName: null,
    imageUrl: '',
    primaryEmailAddressId: 'e',
    emailAddresses: [{ id: 'e', emailAddress: `${id}@example.com` }],
    publicMetadata: {},
  };
}

async function seedUser(id: string): Promise<void> {
  await testDb.db.users.upsertFromClerk(clerkFixture(id));
}

afterAll(async () => {
  await testDb.close();
});

beforeEach(async () => {
  await testDb.reset();
});

describe('healthRepo.overall', () => {
  it('returns driver + size + the migrated tables', async () => {
    const health = await testDb.db.$health.overall();
    expect(health.driver).toBe('pglite');
    expect(health.databaseBytes).toBeGreaterThan(0);
    const names = health.tables.map((t) => t.name).sort();
    expect(names).toEqual(['posts', 'users']);
  });

  it('each table entry carries numeric stats', async () => {
    const health = await testDb.db.$health.overall();
    for (const t of health.tables) {
      expect(typeof t.estimatedRows).toBe('number');
      expect(typeof t.totalBytes).toBe('number');
      expect(typeof t.reads).toBe('number');
      expect(typeof t.writes).toBe('number');
      expect(Number.isFinite(t.estimatedRows)).toBe(true);
      expect(Number.isFinite(t.totalBytes)).toBe(true);
    }
  });
});

describe('healthRepo.rows', () => {
  it('returns columns + rows + totalRows for a known table', async () => {
    await seedUser('user_1');
    await seedUser('user_2');
    await testDb.db.posts.create({
      title: 'hello',
      body: 'world',
      authorId: 'user_1',
    });
    await testDb.db.posts.create({
      title: 'second',
      body: 'body',
      authorId: 'user_2',
    });
    const out = await testDb.db.$health.rows('posts');
    expect(out.table).toBe('posts');
    expect(out.columns.sort()).toEqual([
      'author_id',
      'body',
      'created_at',
      'id',
      'title',
    ]);
    expect(out.rows.length).toBe(2);
    expect(out.totalRows).toBe(2);
    expect(out.limit).toBe(50);
    expect(out.offset).toBe(0);
  });

  it('honors limit and offset', async () => {
    await seedUser('u');
    for (let i = 0; i < 5; i++) {
      await testDb.db.posts.create({
        title: `t${i}`,
        body: `b${i}`,
        authorId: 'u',
      });
    }
    const page = await testDb.db.$health.rows('posts', 2, 2);
    expect(page.rows.length).toBe(2);
    expect(page.limit).toBe(2);
    expect(page.offset).toBe(2);
    expect(page.totalRows).toBe(5);
  });

  it('throws NOT_FOUND for an unknown / non-public table', async () => {
    await expect(testDb.db.$health.rows('not_a_table')).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError &&
        e.status === 404 &&
        e.code === 'NOT_FOUND',
    );
  });

  it('rejects an injection attempt disguised as a table name', async () => {
    await expect(
      testDb.db.$health.rows('posts; DROP TABLE posts --'),
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BackendError && e.code === 'NOT_FOUND',
    );
    // posts table must still exist and be queryable
    const stillThere = await testDb.db.$health.rows('posts');
    expect(stillThere.table).toBe('posts');
  });
});
