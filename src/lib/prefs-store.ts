"use client";

import { useBackend } from "@/lib/backend";
import {
  overlayFields, parseMeta, restoreSliceSync, sliceSyncOf, wholeSliceFields,
  type PrefsMeta, type SliceSync, type SyncSets,
} from "@/lib/prefs-dirty";

/** Singleton client-side store for the user's preferences blob. Every
 *  pref slice (caret, behaviour, appearance, keyboard, theme, palette)
 *  reads from and writes through this module. Two-tier persistence:
 *    - signed-in users: /api/prefs/get is the source of truth on
 *      load; localStorage is mirrored so first paint after a refresh
 *      shows live values before the GET resolves
 *    - anon users: localStorage IS the source of truth. The backend
 *      POST still fires on every burst but silently 401s — when the
 *      user later signs in, their cached blob is the merge baseline
 *      so settings carry across the auth boundary.
 *  One GET on load, one debounced POST per burst, plus a synchronous
 *  localStorage write-through. */
const LS_KEY = "flinttype:prefs:v1";

function lsRead(): PrefsBlob | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as PrefsBlob;
  } catch {
    /* corrupted / quota — fall through to null */
  }
  return null;
}

function lsWrite(blob: PrefsBlob): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(blob));
  } catch { /* quota / private mode — fail silent */ }
}

export type PrefsBlob = Record<string, unknown>;
export type Listener = () => void;

let cache: PrefsBlob | null = null;
let loadPromise: Promise<PrefsBlob> | null = null;
/** True until an account's own copy is merged in after a carry-over (or for
 *  edits it has never confirmed): loads run the GET despite `cache`, saves wait. */
let forceReload = false;
let resets = 0; // moves on at every reset, so an older save leaves the new store alone
const listeners = new Set<Listener>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let writeInFlight: Promise<boolean> | null = null;

const WRITE_DEBOUNCE_MS = 400;

/** Version stamps backing the stale-backend guard. `localVersion`
 *  increments on every local write; `syncedVersion` advances to the
 *  version a backend save *confirmed*. When localVersion > syncedVersion
 *  the device holds edits the server hasn't acknowledged, so on load
 *  those edits win over the (possibly stale) server copy instead of
 *  being silently overwritten — that's the "theme reverts on its own"
 *  bug. Persisted to a SEPARATE localStorage key so the prefs blob
 *  itself stays the bare shape the pre-hydration bootstrap reads
 *  (src/lib/bootstrap.ts). */
const META_KEY = "flinttype:prefs:meta";
let localVersion = 0;
let syncedVersion = 0;
let metaLoaded = false;

/** The Clerk userId that the current `cache` / localStorage belongs to.
 *  `null` means anon/unknown. Tracked so a sign-out or an account switch
 *  on a shared browser resets the store (see `syncPrefsOwner`) instead of
 *  bleeding user A's settings into user B's account. Persisted in META_KEY
 *  alongside the version stamps. */
let owner: string | null = null;

/** Per-slice dirty tracking (the flush transport). The flush only sends
 *  the slices the client actually changed (`dirtyKeys`, merged
 *  server-side) and the ones it deleted (`removedKeys`) — never the whole
 *  blob, so it can't revert server-owned slices (adaptRecency,
 *  selectedTags, …) or a slice another device just saved. Persisted in
 *  the meta record (`d`/`r`) so a reload with unsynced edits re-flushes
 *  only those slices. */
const dirtyKeys = new Set<string>();
const removedKeys = new Set<string>();

/** Field-granular dirty tracking (the merge-on-load refinement).
 *  `dirty[sliceKey]` is the set of field names *within* that slice the
 *  user has actually modified since the last confirmed sync. On a load
 *  where local edits win (localVersion > syncedVersion) we overlay ONLY
 *  these fields on top of the remote slice, so an unconfirmed one-field
 *  edit on a fresh device no longer blows away every other
 *  (server-populated) field in the slice. `removed` holds slices the
 *  user explicitly reset (clearSlice) while unsynced — those should be
 *  dropped from the merge even though the remote still has them. Both are
 *  persisted in META_KEY (`dirty`/`removed`) so they survive a reload. */
let dirty: Record<string, string[]> = {};
let removed: Set<string> = new Set();

function metaRead(): PrefsMeta {
  if (typeof window === "undefined") return parseMeta(null);
  try {
    return parseMeta(window.localStorage.getItem(META_KEY));
  } catch {
    return parseMeta(null); // storage blocked: treat as clean
  }
}

function metaWrite(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      META_KEY,
      JSON.stringify({
        v: localVersion,
        sv: syncedVersion,
        owner,
        d: [...dirtyKeys],
        r: [...removedKeys],
        dirty,
        removed: [...removed],
      }),
    );
  } catch {
    /* quota / private mode — fail silent */
  }
}

/** Hydrate the version stamps + owner + dirty tracking from localStorage
 *  once per session. */
function ensureMeta(): void {
  if (metaLoaded) return;
  metaLoaded = true;
  const m = metaRead();
  localVersion = m.v;
  syncedVersion = m.sv;
  owner = m.owner;
  for (const k of m.d) dirtyKeys.add(k);
  for (const k of m.r) removedKeys.add(k);
  dirty = m.dirty;
  removed = new Set(m.removed);
  forceReload = owner !== null && syncedVersion === 0 && localVersion > 0; // a carry-over after a reload
  // Legacy meta from before per-slice tracking carries field-granular
  // dirty/removed but no d/r — backfill the slice-level sets so the
  // re-flush transport still converges.
  if (m.d.length === 0 && m.r.length === 0) {
    for (const k of Object.keys(dirty)) dirtyKeys.add(k);
    for (const k of removed) removedKeys.add(k);
  }
}

/** Reconcile the store with the currently signed-in user. Called from
 *  `<PrefsOwnerSync>` whenever Clerk's `userId` changes (sign-in,
 *  sign-out, account switch).
 *
 *  Three outcomes:
 *    - same owner → no-op (don't wipe a user's local mirror needlessly).
 *    - signed in while owner was anon/null → CARRY OVER: keep the cache +
 *      localStorage (the intentional anon→signin path documented at the
 *      top of this module) and run the GET at once so the new account's
 *      remote merges in under it. No save goes out before that merge.
 *    - any other change (A→B account switch, A→sign-out) → RESET: drop the
 *      cache + localStorage entirely so the next load seeds nothing local
 *      and GETs the correct user's blob. Kills both the cross-user bleed
 *      and the soft-nav stale-cache short-circuit (cache is now null, so
 *      the GET fires). */
export function syncPrefsOwner(userId: string | null): void {
  ensureMeta();
  const prev = owner;
  if (userId === prev) return;

  if (userId !== null && prev === null) {
    // Carry-over: keep the local cache as the merge baseline, claim the new
    // owner and merge the account's copy in now; the pending save waits.
    owner = userId;
    metaWrite();
    loadPromise = null;
    forceReload = true;
    stopTimer();
    void loadPrefs();
    return;
  }

  // Reset: account switch (A→B) or sign-out (A→null). Nothing of the prior
  // owner may survive in cache or localStorage.
  resets++;
  cache = null;
  loadPromise = null;
  forceReload = false;
  localVersion = 0;
  syncedVersion = 0;
  dirtyKeys.clear();
  removedKeys.clear();
  dirty = {};
  removed = new Set();
  stopTimer();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(LS_KEY);
      window.localStorage.removeItem(META_KEY);
    } catch {
      /* quota / private mode — fail silent */
    }
  }
  owner = userId;
  metaWrite();
  // Drop the prior user's values from mounted hooks now, not at the next GET.
  notify();
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/** Subscribe to store changes. Returns an unsubscribe fn. */
export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => void listeners.delete(l);
}

function notify(): void {
  for (const l of listeners) l();
}

/** Returns the current cache (synchronously). `null` until the first
 *  load resolves — callers should treat `null` as "still loading,
 *  fall back to defaults". */
export function getCache(): PrefsBlob | null {
  return cache;
}

/** Lazy load the blob from the backend. Idempotent — concurrent
 *  callers all await the same in-flight promise. Resolves to `{}` on
 *  unauthenticated / network errors so client UX never blocks on the
 *  signed-out path. */
export function loadPrefs(): Promise<PrefsBlob> {
  if (cache && !forceReload) return Promise.resolve(cache);
  if (loadPromise) return loadPromise;
  // Seed the cache from localStorage *synchronously* so the first
  // render after page load shows the user's stored choices instead
  // of the bare defaults — even before the backend GET resolves
  // (or even when the user is anonymous and the GET 401s).
  ensureMeta();
  const seeded = cache ? null : lsRead(); // a retried merge keeps the live cache
  if (seeded) {
    cache = seeded;
    notify();
  }
  const from = owner;
  loadPromise = (async () => {
    try {
      const backend = useBackend();
      const blob = await backend.prefs.get();
      // Signed in or out meanwhile: this copy isn't the owner's, so drop it.
      if (owner !== from) return cache ?? {};
      forceReload = false; // the account's copy is in: saves may go out
      const local = cache ?? {};
      const remote = (blob ?? {}) as PrefsBlob;
      // Stale-backend guard. If the device has local edits the server
      // hasn't confirmed (localVersion > syncedVersion), those edits
      // win — the server copy may be behind (a debounced save that
      // never landed, or one that 401'd / failed), and letting it
      // overwrite would silently wipe a setting the user just changed
      // (the theme-reverts-on-its-own bug). Local wins, the backend
      // fills in slices the device doesn't have, and we re-flush so the
      // server converges. When the device is in sync, the backend stays
      // authoritative so cross-device changes still flow in.
      if (localVersion > syncedVersion) {
        // Field-granular merge: remote is the base, and for each local
        // slice we overlay ONLY the fields the user actually touched
        // since the last confirmed sync (tracked in `dirty`). This keeps
        // untouched, server-populated fields in a slice alive when the
        // user made a single unconfirmed edit on a fresh device — the
        // FT-013 bug. When we have no field-level dirty info for a slice
        // (whole-slice dirty, a primitive value, or a slice the server
        // lacks), the whole local slice wins — that's the back-compat
        // path for the theme-revert fix and for reset/clearSlice.
        const merged: PrefsBlob = { ...remote };
        for (const key of Object.keys(local)) {
          const localVal = local[key];
          const remoteVal = remote[key];
          const fields = dirty[key];
          if (isPlainObject(localVal) && isPlainObject(remoteVal) && fields?.length) {
            merged[key] = overlayFields(remoteVal, localVal, fields);
          } else {
            merged[key] = localVal;
          }
        }
        // Slices the user explicitly reset while unsynced must NOT be
        // resurrected from the remote copy.
        for (const key of removed) delete merged[key];
        cache = merged;
        // Legacy meta (pre per-slice tracking) carries no dirty-key
        // list — fall back to treating every locally-held slice as
        // dirty so the re-flush transport still converges. It goes
        // through the merge route either way, so server-owned slices
        // are safe.
        if (dirtyKeys.size === 0 && removedKeys.size === 0) {
          for (const k of Object.keys(local)) dirtyKeys.add(k);
        }
        scheduleWrite();
      } else {
        cache = { ...local, ...remote };
      }
      lsWrite(cache);
    } catch {
      // Anon / 401, or a network blip: keep the seeded cache (or the empty one).
      if (!cache && owner === from) cache = {};
    } finally {
      if (owner === from) loadPromise = null;
      notify();
    }
    return cache ?? {};
  })();
  return loadPromise;
}

/** Read a slice. Returns `defaults` if the cache hasn't loaded yet or
 *  the slice doesn't exist. Slice values are merged on top of defaults
 *  so partial blobs (e.g. an old blob that predates a new field) still
 *  return a complete slice. */
export function readSlice<T extends object>(key: string, defaults: T): T {
  if (!cache) return defaults;
  const slice = cache[key];
  if (slice && typeof slice === "object") {
    return { ...defaults, ...(slice as object) } as T;
  }
  return defaults;
}

/** Write a slice. Updates the in-memory cache, mirrors to
 *  localStorage so anon users keep their edits across reloads, and
 *  schedules a debounced backend save (silent 401 on anon). */
export function writeSlice<T>(
  key: string,
  value: T,
  changedFields?: readonly string[],
): void {
  ensureMeta();
  const previous = cache?.[key];
  cache = { ...(cache ?? {}), [key]: value as unknown };
  dirtyKeys.add(key);
  removedKeys.delete(key);
  localVersion++;
  // Track which fields the user touched. When the caller doesn't say
  // (legacy callers), the whole slice wins (`wholeSliceFields`).
  const fields = changedFields ?? wholeSliceFields(value, previous);
  const existing = dirty[key] ?? [];
  dirty[key] = Array.from(new Set([...existing, ...fields]));
  // A write to a slice supersedes a prior reset of it.
  removed.delete(key);
  lsWrite(cache);
  metaWrite();
  notify();
  scheduleWrite();
}

/** Drop a slice entirely (used by `reset()` flows). */
export function clearSlice(key: string): void {
  if (!cache) return;
  ensureMeta();
  const next = { ...cache };
  delete next[key];
  cache = next;
  removedKeys.add(key);
  dirtyKeys.delete(key);
  localVersion++;
  // A reset is an explicit user intent that must win over the remote
  // copy on the next load — record it so the merge drops the slice
  // instead of resurrecting it from `remote`. Field-level dirty for the
  // slice is now meaningless (the slice is gone), so clear it.
  delete dirty[key];
  removed.add(key);
  lsWrite(cache);
  metaWrite();
  notify();
  scheduleWrite();
}

const syncSets = (): SyncSets => ({ dirty, dirtyKeys, removedKeys, removed });

/** The local version stamp; every write moves it on by one. */
export function prefsVersion(): number {
  ensureMeta();
  return localVersion;
}

/** The Clerk userId the store's values belong to; null when signed out. */
export function prefsOwner(): string | null {
  ensureMeta();
  return owner;
}

/** True while a sign-in's merge with the account's own copy hasn't landed. */
export function prefsMergePending(): boolean {
  ensureMeta();
  return forceReload;
}

/** What the store records about saving `key`, for `restoreSync`. */
export function sliceSync(key: string): SliceSync {
  ensureMeta();
  return sliceSyncOf(syncSets(), key);
}

/** Resolves once no save is in flight. */
export async function settlePrefs(): Promise<void> {
  while (writeInFlight) await writeInFlight;
}

/** Take back the save bookkeeping of a batch of writes whose values
 *  were just put back (an import's Undo): each slice in `prior` gets
 *  that record (from before the batch, plus anyone else's marks since).
 *  `since` is the version before the batch, `own` how many writes since
 *  were the batch's. Does nothing while a save is in flight, once one
 *  made after `since` was confirmed (the values put back are then saved
 *  like any edit), or after a reset for another owner. */
export function restoreSync(since: number, own: number, prior: ReadonlyMap<string, SliceSync>): boolean {
  ensureMeta();
  if (writeInFlight || syncedVersion > since || localVersion < since) return false;
  for (const [key, s] of prior) restoreSliceSync(syncSets(), key, s);
  // Other writes meanwhile keep the stamp ahead, so they still win on load.
  if (localVersion - since === own) localVersion = since;
  metaWrite();
  if (dirtyKeys.size > 0 || removedKeys.size > 0) scheduleWrite();
  return true;
}

function stopTimer(): void {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = null;
}

function scheduleWrite(): void {
  if (typeof window === "undefined") return;
  stopTimer();
  writeTimer = setTimeout(flush, WRITE_DEBOUNCE_MS);
}

/** Send the pending save now. Resolves to whether the server confirmed it (false when signed out or reset meanwhile). */
export async function flushPrefs(): Promise<boolean> {
  stopTimer();
  const at = resets;
  await settlePrefs();
  return resets === at && flush();
}

/** Resolves to whether the server confirmed the save (or there was none). */
async function flush(): Promise<boolean> {
  writeTimer = null;
  // Nothing goes to an account before its own copy is merged in; marks wait.
  const from = owner;
  const at = resets;
  if (forceReload || loadPromise) await (loadPromise ?? loadPrefs());
  if (owner !== from || forceReload) return false;
  if (writeInFlight) {
    // Wait for the in-flight write, then schedule another so the
    // final cache snapshot still goes out.
    await writeInFlight;
    scheduleWrite();
    return false;
  }
  if (!cache) return false;
  const snapshot = cache;
  const sending = localVersion;
  // Per-slice patch: only the slices the client changed travel. The
  // server merges them (jsonb ||) instead of replacing the row, so a
  // flush can never revert server-owned slices or another device's
  // saves. Snapshot + clear the sets up front — a write that lands
  // mid-flight re-dirties its key and reschedules.
  const sendDirty = [...dirtyKeys].filter((k) => k in snapshot);
  const sendRemoved = [...removedKeys];
  dirtyKeys.clear();
  removedKeys.clear();
  const data: PrefsBlob = {};
  for (const k of sendDirty) data[k] = snapshot[k];
  // Snapshot the dirty fields being persisted by this write. On success
  // we clear exactly these (set-difference) and NOT any field edits that
  // happened after the snapshot was captured (during the in-flight POST,
  // which bumped localVersion past `sending`). Also snapshot the removed
  // slices the snapshot embodies (their absence is what's being saved).
  const dirtySnapshot: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(dirty)) dirtySnapshot[k] = [...v];
  const removedSnapshot = new Set(removed);
  // Tracked out here: a save with nothing to send ends synchronously.
  const flight = (async () => {
    try {
      if (sendDirty.length > 0 || sendRemoved.length > 0) {
        const backend = useBackend();
        await backend.prefs.merge({
          data,
          ...(sendRemoved.length > 0 ? { remove: sendRemoved } : {}),
        });
      }
      // Saved for the owner it was sent for; a new owner's stamps stay theirs.
      if (owner !== from || resets !== at) return true;
      // Confirmed persisted — advance the synced stamp so a later load
      // treats the backend as authoritative again. On failure we leave
      // it behind, so the unsaved edits keep winning until a save lands.
      if (sending > syncedVersion) {
        syncedVersion = sending;
        // The server now holds everything in `snapshot`, so the fields it
        // embodies are no longer "unconfirmed". Remove exactly the
        // snapshotted fields, leaving any newer edits made during the
        // flight still marked dirty.
        for (const [k, savedFields] of Object.entries(dirtySnapshot)) {
          const current = dirty[k];
          if (!current) continue;
          const saved = new Set(savedFields);
          const remaining = current.filter((f) => !saved.has(f));
          if (remaining.length > 0) dirty[k] = remaining;
          else delete dirty[k];
        }
        // Resets embodied by this snapshot are now persisted server-side
        // too — drop them from `removed` so they don't keep shielding the
        // slice on every future load. A re-add (clearSlice) after the
        // snapshot stays (it isn't in `removedSnapshot`).
        for (const k of removedSnapshot) removed.delete(k);
        metaWrite();
      }
      return true;
    } catch {
      // Reset meanwhile: these marks were the old owner's, so they stay out.
      if (resets !== at) return false;
      // Unauthenticated / transient — keep the keys marked dirty so a
      // later flush (or the post-reload re-flush) retries them. A key
      // must live in at most ONE of dirtyKeys/removedKeys: a clearSlice
      // (or writeSlice) that raced this in-flight flush expresses newer
      // user intent, so never restore a key into the opposite set.
      for (const k of sendDirty) {
        if (!removedKeys.has(k)) dirtyKeys.add(k);
      }
      for (const k of sendRemoved) {
        // A concurrent writeSlice supersedes the older remove.
        if (!dirtyKeys.has(k)) removedKeys.add(k);
      }
      metaWrite();
      return false;
    }
  })();
  writeInFlight = flight;
  const confirmed = await flight;
  if (writeInFlight === flight) writeInFlight = null;
  return confirmed;
}

/** Test-only escape hatch — drops the cache so the next load goes to
 *  the network again. Not exported through any barrel. */
export function __resetForTests(): void {
  cache = null;
  loadPromise = null;
  forceReload = false;
  writeInFlight = null;
  localVersion = 0;
  syncedVersion = 0;
  metaLoaded = false;
  owner = null;
  dirtyKeys.clear();
  removedKeys.clear();
  dirty = {};
  removed = new Set();
  stopTimer();
  listeners.clear();
}
