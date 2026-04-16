import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase } from '../testing';

const { db, reset, close } = await createTestDatabase();
const { posts } = db;

beforeEach(async () => {
  await reset();
});

afterAll(async () => {
  await close();
});

describe('postsRepo.list', () => {
  it('returns an empty array when no rows exist', async () => {
    expect(await posts.list()).toEqual([]);
  });

  it('returns posts ordered by createdAt desc', async () => {
    const a = await posts.create({
      title: 'A',
      body: 'first',
      authorId: 'u_1',
    });
    await new Promise((r) => setTimeout(r, 5));
    const b = await posts.create({
      title: 'B',
      body: 'second',
      authorId: 'u_1',
    });
    const out = await posts.list();
    expect(out.map((p) => p.id)).toEqual([b.id, a.id]);
  });

  it('respects the limit option', async () => {
    await posts.create({ title: 'A', body: 'x', authorId: 'u_1' });
    await posts.create({ title: 'B', body: 'y', authorId: 'u_1' });
    expect(await posts.list({ limit: 1 })).toHaveLength(1);
  });
});

describe('postsRepo.findById', () => {
  it('returns null for an unknown id', async () => {
    expect(await posts.findById('nope')).toBeNull();
  });

  it('returns the matching post', async () => {
    const created = await posts.create({
      title: 'T',
      body: 'b',
      authorId: 'u_1',
    });
    const found = await posts.findById(created.id);
    expect(found?.title).toBe('T');
  });
});

describe('postsRepo.create', () => {
  it('assigns an id and a createdAt timestamp', async () => {
    const post = await posts.create({
      title: 'T',
      body: 'b',
      authorId: 'u_1',
    });
    expect(post.id).toMatch(/^[0-9a-f-]+$/);
    expect(post.createdAt).toBeInstanceOf(Date);
  });
});

describe('postsRepo.removeOwned', () => {
  it('removes a row when the authorId matches', async () => {
    const post = await posts.create({
      title: 'T',
      body: 'b',
      authorId: 'u_1',
    });
    const removed = await posts.removeOwned({
      id: post.id,
      authorId: 'u_1',
    });
    expect(removed).toBe(true);
    expect(await posts.findById(post.id)).toBeNull();
  });

  it('does not remove when authorId does not match', async () => {
    const post = await posts.create({
      title: 'T',
      body: 'b',
      authorId: 'u_1',
    });
    const removed = await posts.removeOwned({
      id: post.id,
      authorId: 'someone_else',
    });
    expect(removed).toBe(false);
    expect(await posts.findById(post.id)).not.toBeNull();
  });

  it('returns false for unknown ids', async () => {
    const removed = await posts.removeOwned({
      id: 'nope',
      authorId: 'u_1',
    });
    expect(removed).toBe(false);
  });
});
