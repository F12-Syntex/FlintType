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
const listeners = new Set<Listener>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let writeInFlight: Promise<void> | null = null;

const WRITE_DEBOUNCE_MS = 400;

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
  if (cache) return Promise.resolve(cache);
  if (loadPromise) return loadPromise;
  // Seed the cache from localStorage *synchronously* so the first
  // render after page load shows the user's stored choices instead
  // of the bare defaults — even before the backend GET resolves
  // (or even when the user is anonymous and the GET 401s).
  const seeded = lsRead();
  if (seeded) {
    cache = seeded;
    notify();
  }
  loadPromise = (async () => {
    try {
      const backend = useBackend();
      const blob = await backend.prefs.get();
      // Backend wins for signed-in users — overlay onto whatever
      // localStorage seeded so any anon-side edits made *before*
      // the GET resolves don't get clobbered by the network result
      // (their write will flush momentarily anyway).
      cache = { ...(cache ?? {}), ...(blob ?? {}) };
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
  cache = { ...(cache ?? {}), [key]: value as unknown };
  lsWrite(cache);
  notify();
  scheduleWrite();
}

/** Drop a slice entirely (used by `reset()` flows). */
export function clearSlice(key: string): void {
  if (!cache) return;
  const next = { ...cache };
  delete next[key];
  cache = next;
  lsWrite(cache);
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
  writeInFlight = (async () => {
    try {
      const backend = useBackend();
      await backend.prefs.set({ data: snapshot });
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
  if (writeTimer) {
    clearTimeout(writeTimer);
    writeTimer = null;
  }
  listeners.clear();
}
