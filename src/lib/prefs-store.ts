"use client";

import { BackendError } from "@/lib/errors";
import { useBackend } from "@/lib/backend";

/** Singleton client-side store for the user's preferences blob. Every
 *  pref slice (caret, behaviour, appearance, keyboard, theme, palette)
 *  reads from and writes through this module.
 *
 *  Two-tier persistence:
 *    - signed-in users: /api/prefs/get is the source of truth on
 *      load; localStorage is mirrored so first paint after a refresh
 *      shows live values before the GET resolves
 *    - anon users: localStorage IS the source of truth. The backend
 *      POST still fires on every burst but silently 401s — when the
 *      user later signs in, their cached blob is the merge baseline
 *      so settings carry across the auth boundary
 *
 *  One GET on load, one debounced POST per burst, plus a synchronous
 *  localStorage write-through. */
const LS_KEY = "flinttype:prefs:v1";

function lsRead(): PrefsBlob | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as PrefsBlob;
    }
  } catch {
    /* corrupted / quota — fall through to null */
  }
  return null;
}

function lsWrite(blob: PrefsBlob): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(blob));
  } catch {
    /* quota / private mode — fail silent */
  }
}

export type PrefsBlob = Record<string, unknown>;
export type Listener = () => void;

let cache: PrefsBlob | null = null;
let loadPromise: Promise<PrefsBlob> | null = null;
/** Set by `syncPrefsOwner` on the anon→sign-in carry-over: the local
 *  cache survives as the merge baseline, but the next `loadPrefs()` must
 *  still re-run the GET so the new account's remote merges on top — even
 *  though `cache` is already populated (which would normally short-circuit
 *  the load). One-shot: cleared as soon as that load starts. */
let forceReload = false;
const listeners = new Set<Listener>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let writeInFlight: Promise<void> | null = null;

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

function metaRead(): { v: number; sv: number; owner: string | null } {
  if (typeof window === "undefined") return { v: 0, sv: 0, owner: null };
  try {
    const raw = window.localStorage.getItem(META_KEY);
    if (raw) {
      const p = JSON.parse(raw) as {
        v?: unknown;
        sv?: unknown;
        owner?: unknown;
      };
      if (typeof p?.v === "number" && typeof p?.sv === "number") {
        // Defensive: an OLD `{v,sv}`-only blob has no `owner` — treat the
        // missing field as null (anon/unknown).
        return {
          v: p.v,
          sv: p.sv,
          owner: typeof p.owner === "string" ? p.owner : null,
        };
      }
    }
  } catch {
    /* corrupted — treat as clean (backend authoritative) */
  }
  return { v: 0, sv: 0, owner: null };
}

function metaWrite(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      META_KEY,
      JSON.stringify({ v: localVersion, sv: syncedVersion, owner }),
    );
  } catch {
    /* quota / private mode — fail silent */
  }
}

/** Hydrate the version stamps + owner from localStorage once per session. */
function ensureMeta(): void {
  if (metaLoaded) return;
  metaLoaded = true;
  const m = metaRead();
  localVersion = m.v;
  syncedVersion = m.sv;
  owner = m.owner;
}

/** Reconcile the store with the currently signed-in user. Called from
 *  `<PrefsOwnerSync>` whenever Clerk's `userId` changes (sign-in,
 *  sign-out, account switch).
 *
 *  Three outcomes:
 *    - same owner → no-op (don't wipe a user's local mirror needlessly).
 *    - signed in while owner was anon/null → CARRY OVER: keep the cache +
 *      localStorage (the intentional anon→signin path documented at the
 *      top of this module) and re-run the GET so the new account's remote
 *      merges on top of the carried-over local blob.
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
    // Carry-over: a brand-new anonymous user (or unknown owner) signs in.
    // Keep the local cache as the merge baseline, claim the new owner, and
    // force a fresh GET so the account's remote merges on top.
    owner = userId;
    metaWrite();
    loadPromise = null;
    forceReload = true;
    return;
  }

  // Reset: account switch (A→B) or sign-out (A→null). Nothing of the prior
  // owner may survive in cache or localStorage.
  cache = null;
  loadPromise = null;
  localVersion = 0;
  syncedVersion = 0;
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
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
  // Drop the prior user's values from any mounted hooks immediately rather
  // than leaving them stale until the next GET resolves.
  notify();
}

/** Subscribe to store changes. Returns an unsubscribe fn. */
export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
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
  // Consume the one-shot carry-over flag — the GET below merges the new
  // account's remote on top of the carried-over local cache.
  forceReload = false;
  // Seed the cache from localStorage *synchronously* so the first
  // render after page load shows the user's stored choices instead
  // of the bare defaults — even before the backend GET resolves
  // (or even when the user is anonymous and the GET 401s).
  ensureMeta();
  const seeded = lsRead();
  if (seeded) {
    cache = seeded;
    notify();
  }
  loadPromise = (async () => {
    try {
      const backend = useBackend();
      const blob = await backend.prefs.get();
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
        cache = { ...remote, ...local };
        scheduleWrite();
      } else {
        cache = { ...local, ...remote };
      }
      lsWrite(cache);
    } catch (err) {
      // Anon / 401 — keep the seeded cache (or the empty one).
      if (!(err instanceof BackendError && err.code === "UNAUTHORIZED")) {
        // Network blip, etc. — same fallback.
      }
      if (!cache) cache = {};
    } finally {
      loadPromise = null;
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
export function writeSlice<T>(key: string, value: T): void {
  ensureMeta();
  cache = { ...(cache ?? {}), [key]: value as unknown };
  localVersion++;
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
  localVersion++;
  lsWrite(cache);
  metaWrite();
  notify();
  scheduleWrite();
}

function scheduleWrite(): void {
  if (typeof window === "undefined") return;
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(flush, WRITE_DEBOUNCE_MS);
}

async function flush(): Promise<void> {
  writeTimer = null;
  if (writeInFlight) {
    // Wait for the in-flight write, then schedule another so the
    // final cache snapshot still goes out.
    await writeInFlight;
    scheduleWrite();
    return;
  }
  if (!cache) return;
  const snapshot = cache;
  const sending = localVersion;
  writeInFlight = (async () => {
    try {
      const backend = useBackend();
      await backend.prefs.set({ data: snapshot });
      // Confirmed persisted — advance the synced stamp so a later load
      // treats the backend as authoritative again. On failure we leave
      // it behind, so the unsaved edits keep winning until a save lands.
      if (sending > syncedVersion) {
        syncedVersion = sending;
        metaWrite();
      }
    } catch {
      /* unauthenticated / transient — local state stays current */
    } finally {
      writeInFlight = null;
    }
  })();
  await writeInFlight;
}

/** Test-only escape hatch — drops the cache so the next load goes to
 *  the network again. Not exported through any barrel. */
export function __resetForTests(): void {
  cache = null;
  loadPromise = null;
  forceReload = false;
  localVersion = 0;
  syncedVersion = 0;
  metaLoaded = false;
  owner = null;
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  listeners.clear();
}
