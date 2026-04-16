import { describe, expect, it, vi } from 'vitest';

vi.mock('@electric-sql/pglite', async () => {
  const actual =
    await vi.importActual<typeof import('@electric-sql/pglite')>(
      '@electric-sql/pglite',
    );
  class MockPGlite extends actual.PGlite {
    constructor() {
      super();
    }
  }
  return { ...actual, PGlite: MockPGlite };
});

import { getLocalDatabase } from './index';

describe('getLocalDatabase', () => {
  it('returns a LocalDatabase with a notes repo after initialization', async () => {
    const db = await getLocalDatabase();
    expect(db.notes).toBeDefined();
    expect(typeof db.notes.list).toBe('function');
    expect(typeof db.notes.create).toBe('function');
    expect(typeof db.notes.remove).toBe('function');
  });

  it('caches the instance across sequential calls (singleton)', async () => {
    const a = await getLocalDatabase();
    const b = await getLocalDatabase();
    expect(a).toBe(b);
  });

  it('shares the in-flight init promise between concurrent calls', async () => {
    const [a, b, c] = await Promise.all([
      getLocalDatabase(),
      getLocalDatabase(),
      getLocalDatabase(),
    ]);
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('initializes the schema so repo calls work end-to-end', async () => {
    const db = await getLocalDatabase();
    const before = await db.notes.list();
    const created = await db.notes.create({ title: 't', body: 'b' });
    const after = await db.notes.list();
    expect(after.length).toBe(before.length + 1);
    expect(after.some((n) => n.id === created.id)).toBe(true);
  });
});
