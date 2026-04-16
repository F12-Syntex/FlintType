'use client';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/db/schema';
import { ensureClientSchema } from './init';
import { notesClientRepo, type NotesClientRepo } from './repositories/notes';

export type LocalDatabase = {
  notes: NotesClientRepo;
};

const STORAGE = 'idb://appstate';

let instance: LocalDatabase | null = null;
let initPromise: Promise<LocalDatabase> | null = null;

async function init(): Promise<LocalDatabase> {
  const client = new PGlite(STORAGE);
  const drz = drizzle(client, { schema });
  await ensureClientSchema(drz);
  instance = { notes: notesClientRepo(drz) };
  return instance;
}

export function getLocalDatabase(): Promise<LocalDatabase> {
  if (instance) return Promise.resolve(instance);
  if (!initPromise) initPromise = init();
  return initPromise;
}
