import type { ImportSliceKey } from "@/types/settings-import";
import { changedSince, keepOthers, type SliceSync } from "../prefs-dirty";
import { getCache, prefsOwner, prefsVersion, sliceSync } from "../prefs-store";
import { rawSlice } from "./slices";

/** What an import has to remember to be undone exactly. Before a value
 *  is first written, the value it replaces (or that there was none) is
 *  kept, with the store's save record for its slice from before the
 *  import touched it. Undo puts each setting the import wrote back to
 *  that value, even one changed again since. Writes made meanwhile by
 *  anyone else (the command palette, another control) to settings the
 *  import didn't write are noted as they're seen, so Undo takes back
 *  only the import's own save bookkeeping and theirs is still saved.
 *  Pure bookkeeping over the prefs store; `apply.ts` writes. */

type Prior = { had: boolean; value: unknown };

export type UndoPoint = {
  /** Whose settings the store held when the import began (`prefsOwner`). */
  owner: string | null;
  /** The store's version stamp when the import began. */
  version: number;
  /** How many store writes since then were the import's or its Undo's. */
  own: number;
  /** Each slice the import touched: whether it existed, and its save
   *  record, from before the first write to it. */
  before: Map<string, { existed: boolean; sync: SliceSync }>;
  /** Each touched slice's save record after the import's last write. */
  seen: Map<string, SliceSync>;
  /** Fields of touched slices that someone else marked unsaved. */
  others: Map<string, Set<string>>;
  /** Touched slices someone else reset: Undo leaves them as they are. */
  resetByOthers: Set<string>;
  slices: Map<ImportSliceKey, Map<string, Prior>>;
  theme: Map<string, string | undefined>;
  /** The palette slice as stored before the first colour or palette write. */
  palette?: Record<string, unknown>;
  /** The mode before it was first set; undefined while untouched. */
  mode?: string | null;
};

export function createUndoPoint(): UndoPoint {
  return {
    owner: prefsOwner(), version: prefsVersion(), own: 0, before: new Map(), seen: new Map(),
    others: new Map(), resetByOthers: new Set(), slices: new Map(), theme: new Map(),
  };
}

/** False once the store belongs to someone else: a sign-in, sign-out or
 *  account switch since the import began. What the undo point recorded
 *  is then about another store, so nothing may be written from it. */
export function canUndo(undo: UndoPoint): boolean {
  return prefsOwner() === undo.owner;
}

/** Note what changed in each touched slice's save record since the
 *  import last wrote: those changes were someone else's. */
export function noteOthers(undo: UndoPoint): void {
  for (const [key, b] of undo.before) {
    const change = changedSince(undo.seen.get(key) ?? b.sync, sliceSync(key));
    if (change.reset) undo.resetByOthers.add(key);
    if (change.fields.length === 0) continue;
    const set = undo.others.get(key) ?? new Set<string>();
    for (const f of change.fields) set.add(f);
    undo.others.set(key, set);
  }
}

/** Run `write` as the import's own: what changed before it is noted as
 *  someone else's, and the store writes it makes are counted. */
export function asImport(undo: UndoPoint, write: () => void): void {
  noteOthers(undo);
  const start = prefsVersion();
  try {
    write();
  } finally {
    undo.own += prefsVersion() - start;
    for (const key of undo.before.keys()) undo.seen.set(key, sliceSync(key));
  }
}

export function rememberSlice(undo: UndoPoint, key: string): void {
  if (undo.before.has(key)) return;
  undo.before.set(key, { existed: key in (getCache() ?? {}), sync: sliceSync(key) });
}

export function rememberField(undo: UndoPoint, slice: ImportSliceKey, field: string): void {
  let fields = undo.slices.get(slice);
  if (!fields) {
    fields = new Map();
    undo.slices.set(slice, fields);
  }
  if (fields.has(field)) return;
  rememberSlice(undo, slice);
  const raw = rawSlice(slice);
  fields.set(field, { had: field in raw, value: raw[field] });
}

/** The save record each touched slice goes back to after Undo: as it
 *  was before the import, plus every field someone else marked since.
 *  A slice someone else reset is left out, so its record stays theirs. */
export function recordsToRestore(undo: UndoPoint): Map<string, SliceSync> {
  noteOthers(undo);
  const out = new Map<string, SliceSync>();
  for (const [key, b] of undo.before) {
    if (!undo.resetByOthers.has(key)) out.set(key, keepOthers(b.sync, [...(undo.others.get(key) ?? [])]));
  }
  return out;
}
