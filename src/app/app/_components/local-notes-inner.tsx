'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLocalDb } from '@/db/client/hook';
import type { Note } from '@/types/note';

export default function LocalNotesInner() {
  const db = useLocalDb();
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (!db) return;
    let cancelled = false;
    db.notes.list().then((loaded) => {
      if (!cancelled) setNotes(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [db]);

  async function add() {
    if (!db || !title.trim() || !body.trim()) return;
    await db.notes.create({ title, body });
    setTitle('');
    setBody('');
    setNotes(await db.notes.list());
  }

  async function remove(id: string) {
    if (!db) return;
    await db.notes.remove(id);
    setNotes(await db.notes.list());
  }

  if (!db) {
    return (
      <p className="text-sm text-zinc-500">Initializing local database…</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="title"
          aria-label="note title"
        />
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="body"
          aria-label="note body"
        />
        <Button onClick={add} disabled={!title.trim() || !body.trim()}>
          Add
        </Button>
      </div>
      {notes.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No notes yet. Data lives only in this browser.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0 break-words text-zinc-600 dark:text-zinc-400">
                <span className="font-medium text-zinc-950 dark:text-zinc-50">
                  {n.title}
                </span>{' '}
                — {n.body}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => remove(n.id)}
                aria-label={`remove ${n.title}`}
                className="self-start sm:self-auto"
              >
                delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
