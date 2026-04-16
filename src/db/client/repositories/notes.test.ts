import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import * as schema from '@/db/schema';
import { ensureClientSchema } from '../init';
import { notesClientRepo } from './notes';

const client = new PGlite();
const drz = drizzle(client, { schema });
await ensureClientSchema(drz);

const notes = notesClientRepo(drz);

beforeEach(async () => {
  await drz.delete(schema.notes);
});

afterAll(async () => {
  await client.close();
});

describe('notesClientRepo.list', () => {
  it('returns an empty array when no notes exist', async () => {
    expect(await notes.list()).toEqual([]);
  });

  it('returns notes ordered by createdAt desc', async () => {
    const a = await notes.create({ title: 'A', body: 'first' });
    await new Promise((r) => setTimeout(r, 5));
    const b = await notes.create({ title: 'B', body: 'second' });
    const out = await notes.list();
    expect(out.map((n) => n.id)).toEqual([b.id, a.id]);
  });
});

describe('notesClientRepo.create', () => {
  it('assigns id and createdAt', async () => {
    const note = await notes.create({ title: 'T', body: 'b' });
    expect(note.id).toMatch(/^[0-9a-f-]+$/);
    expect(note.createdAt).toBeInstanceOf(Date);
  });
});

describe('notesClientRepo.remove', () => {
  it('removes an existing note', async () => {
    const note = await notes.create({ title: 'T', body: 'b' });
    expect(await notes.remove(note.id)).toBe(true);
    expect(await notes.list()).toHaveLength(0);
  });

  it('returns false for unknown ids', async () => {
    expect(await notes.remove('nope')).toBe(false);
  });
});
