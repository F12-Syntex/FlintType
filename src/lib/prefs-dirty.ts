/** How the prefs store (`prefs-store.ts`) keeps track of what still
 *  has to be saved: which fields of a slice are the user's own, how it
 *  lays them over the server copy on load, how its record is read back
 *  from localStorage, and how one slice's record is read and put back.
 *  Pure. */

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** `base` with each of `fields` taken from `local`. A dirty field the
 *  local slice no longer has was removed on purpose (an override
 *  cleared, an Undo dropping a field an import added), so it's removed
 *  from the result too instead of coming back from `base`. */
export function overlayFields(
  base: Record<string, unknown>,
  local: Record<string, unknown>,
  fields: readonly string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const f of fields) {
    if (Object.hasOwn(local, f)) out[f] = local[f];
    else delete out[f];
  }
  return out;
}

/** The fields a whole-slice write changes when the caller doesn't name
 *  them: every field the new value has, and every field the slice had
 *  before and the new value drops, so a dropped one stays dropped on
 *  load. A value that isn't an object changes no fields. */
export function wholeSliceFields(value: unknown, previous: unknown): string[] {
  if (!isPlainObject(value)) return [];
  const before = isPlainObject(previous) ? Object.keys(previous) : [];
  return [...new Set([...Object.keys(value), ...before])];
}

/** The store's save record as kept in localStorage: the version stamps
 *  (`v` local, `sv` confirmed by the server), the owner, the slices to
 *  send (`d`) and to remove (`r`), the unsaved fields per slice and the
 *  slices reset while unsaved. */
export type PrefsMeta = {
  v: number;
  sv: number;
  owner: string | null;
  d: string[];
  r: string[];
  dirty: Record<string, string[]>;
  removed: string[];
};

const strings = (a: unknown): string[] =>
  Array.isArray(a) ? a.filter((k): k is string => typeof k === "string") : [];

/** Read the stored record. Anything unreadable, or without both
 *  version stamps, reads as clean (the server is then authoritative);
 *  a record from before owners were kept reads as anonymous. */
export function parseMeta(raw: string | null): PrefsMeta {
  const clean: PrefsMeta = { v: 0, sv: 0, owner: null, d: [], r: [], dirty: {}, removed: [] };
  if (!raw) return clean;
  let p: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return clean;
    p = parsed;
  } catch {
    return clean;
  }
  if (typeof p.v !== "number" || typeof p.sv !== "number") return clean;
  const dirty: Record<string, string[]> = {};
  if (isPlainObject(p.dirty)) {
    for (const [k, val] of Object.entries(p.dirty)) {
      if (Array.isArray(val) && k !== "__proto__") dirty[k] = strings(val);
    }
  }
  return {
    v: p.v,
    sv: p.sv,
    owner: typeof p.owner === "string" ? p.owner : null,
    d: strings(p.d),
    r: strings(p.r),
    dirty,
    removed: strings(p.removed),
  };
}

/** The store's live save bookkeeping. */
export type SyncSets = {
  dirty: Record<string, string[]>;
  dirtyKeys: Set<string>;
  removedKeys: Set<string>;
  removed: Set<string>;
};

/** What the store records about saving one slice. */
export type SliceSync = {
  /** Its unsaved fields; undefined when it has none. */
  fields?: string[];
  /** Whether the next save sends it. */
  send: boolean;
  /** Whether the next save removes it. */
  remove: boolean;
  /** Whether a reset of it, not yet saved, keeps the server copy out on load. */
  reset: boolean;
};

export function sliceSyncOf(s: SyncSets, key: string): SliceSync {
  const fields = Object.hasOwn(s.dirty, key) ? [...s.dirty[key]] : undefined;
  return {
    ...(fields ? { fields } : {}),
    send: s.dirtyKeys.has(key),
    remove: s.removedKeys.has(key),
    reset: s.removed.has(key),
  };
}

const toggle = (set: Set<string>, key: string, on: boolean) => {
  if (on) set.add(key);
  else set.delete(key);
};

/** Put one slice's record back as `prior` (from `sliceSyncOf`) was. */
export function restoreSliceSync(s: SyncSets, key: string, prior: SliceSync): void {
  if (prior.fields) s.dirty[key] = [...prior.fields];
  else delete s.dirty[key];
  toggle(s.dirtyKeys, key, prior.send);
  toggle(s.removedKeys, key, prior.remove);
  toggle(s.removed, key, prior.reset);
}

/** What someone else changed in a slice's record between two reads: the
 *  fields newly marked unsaved, and whether it was reset. A save landing
 *  in between only takes marks away, so it never shows here. */
export function changedSince(then: SliceSync, now: SliceSync): { fields: string[]; reset: boolean } {
  const had = new Set(then.fields ?? []);
  return { fields: (now.fields ?? []).filter((f) => !had.has(f)), reset: now.reset && !then.reset };
}

/** `prior`, with `others` (fields someone else marked unsaved since)
 *  still marked, and the slice still sent when there are any. */
export function keepOthers(prior: SliceSync, others: readonly string[]): SliceSync {
  if (others.length === 0) return prior;
  return { ...prior, fields: [...new Set([...(prior.fields ?? []), ...others])], send: true };
}
