import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { afterAll, describe, expect, it } from 'vitest';
import * as schema from '@/db/schema/client';
import { ensureClientSchema } from './init';

const client = new PGlite();
const drz = drizzle(client, { schema });

afterAll(async () => {
  await client.close();
});

describe('ensureClientSchema', () => {
  it('creates the notes table with the expected columns', async () => {
    await ensureClientSchema(drz);
    const rows = await drz.execute(sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'notes'
      ORDER BY ordinal_position
    `);
    expect(rows.rows.map((r) => r.column_name)).toEqual([
      'id',
      'title',
      'body',
      'created_at',
    ]);
  });

  it('is idempotent — calling it twice does not throw', async () => {
    await ensureClientSchema(drz);
    await expect(ensureClientSchema(drz)).resolves.toBeUndefined();
  });

  it('leaves pre-existing rows untouched on the second call', async () => {
    await ensureClientSchema(drz);
    await drz.execute(sql`
      INSERT INTO notes (id, title, body) VALUES ('n1', 't', 'b')
    `);
    await ensureClientSchema(drz);
    const rows = await drz.execute(
      sql`SELECT id FROM notes WHERE id = 'n1'`,
    );
    expect(rows.rows).toHaveLength(1);
  });
});
