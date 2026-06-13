// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Backend stubs the store calls into. Tests reassign these per case. */
let mockGet: () => Promise<unknown>;
let mockSet: (input: unknown) => Promise<unknown>;

vi.mock("@/lib/backend", () => ({
  useBackend: () => ({
    prefs: {
      get: () => mockGet(),
      set: (input: unknown) => mockSet(input),
    },
  }),
}));

import {
  __resetForTests,
  getCache,
  loadPrefs,
  readSlice,
  syncPrefsOwner,
  writeSlice,
} from "./prefs-store";

const BLOB_KEY = "flinttype:prefs:v1";
const META_KEY = "flinttype:prefs:meta";

function readMeta(): { v: number; sv: number; owner?: string | null } {
  return JSON.parse(localStorage.getItem(META_KEY) ?? '{"v":0,"sv":0}');
}

describe("prefs-store conflict resolution", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    __resetForTests();
    mockGet = async () => ({});
    mockSet = async () => undefined;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("clean state: the backend copy is authoritative on load", async () => {
    localStorage.setItem(BLOB_KEY, JSON.stringify({ theme: { "--primary": "#aaaaaa" } }));
    localStorage.setItem(META_KEY, JSON.stringify({ v: 0, sv: 0 }));
    mockGet = async () => ({ theme: { "--primary": "#bbbbbb" } });

    await loadPrefs();

    // In sync (no unsaved local edits) → the server value wins, so a
    // change made on another device still flows in.
    expect(readSlice("theme", {})).toEqual({ "--primary": "#bbbbbb" });
  });

  it("unsynced local edits survive a stale backend (the theme-revert bug)", async () => {
    // localStorage holds a just-changed primary the server hasn't
    // acknowledged yet (localVersion 1 > syncedVersion 0).
    localStorage.setItem(BLOB_KEY, JSON.stringify({ theme: { "--primary": "#1e90ff" } }));
    localStorage.setItem(META_KEY, JSON.stringify({ v: 1, sv: 0 }));
    // Server is behind — it still has the default brand orange.
    mockGet = async () => ({ theme: { "--primary": "#f97316" } });

    await loadPrefs();

    // The local edit must NOT be clobbered by the stale server copy.
    expect(readSlice("theme", {})).toEqual({ "--primary": "#1e90ff" });
  });

  it("a dirty load keeps local slices but still pulls in backend-only slices", async () => {
    localStorage.setItem(BLOB_KEY, JSON.stringify({ theme: { "--primary": "#1e90ff" } }));
    localStorage.setItem(META_KEY, JSON.stringify({ v: 1, sv: 0 }));
    mockGet = async () => ({
      theme: { "--primary": "#f97316" },
      audio: { volume: 5 },
    });

    await loadPrefs();

    expect(readSlice("theme", {})).toEqual({ "--primary": "#1e90ff" });
    expect(readSlice("audio", {})).toEqual({ volume: 5 });
  });

  it("a fresh local write is protected from a stale backend on the next load", async () => {
    mockGet = async () => ({ theme: { "--primary": "#f97316" } });
    await loadPrefs();

    writeSlice("theme", { "--primary": "#1e90ff" });
    const meta = readMeta();
    expect(meta.v).toBeGreaterThan(meta.sv); // marked dirty

    // Simulate a reload (fresh module state) while the server is still
    // behind — localStorage persists across the reload.
    __resetForTests();
    await loadPrefs();

    expect(readSlice("theme", {})).toEqual({ "--primary": "#1e90ff" });
  });

  it("once a save lands, the backend is authoritative again", async () => {
    mockGet = async () => ({ theme: { "--primary": "#f97316" } });
    let saved: unknown = null;
    mockSet = async (input) => {
      saved = input;
      return undefined;
    };
    await loadPrefs();

    writeSlice("theme", { "--primary": "#1e90ff" });
    await vi.runAllTimersAsync(); // flush the debounced save

    expect(saved).toEqual(
      expect.objectContaining({
        data: expect.objectContaining({ theme: { "--primary": "#1e90ff" } }),
      }),
    );
    const meta = readMeta();
    expect(meta.sv).toBe(meta.v); // synced

    // Reload: the server now holds a newer value (e.g. from another
    // device). Clean state → it wins.
    __resetForTests();
    mockGet = async () => ({ theme: { "--primary": "#00ff00" } });
    await loadPrefs();

    expect(readSlice("theme", {})).toEqual({ "--primary": "#00ff00" });
  });
});

describe("prefs-store owner isolation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    __resetForTests();
    mockGet = async () => ({});
    mockSet = async () => undefined;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("switching accounts (A→B) wipes A's cache + localStorage and loads only B", async () => {
    // Sign in as A and customise.
    mockGet = async () => ({});
    syncPrefsOwner("A");
    await loadPrefs();
    writeSlice("theme", { "--primary": "#aaaaaa" });
    expect(localStorage.getItem(BLOB_KEY)).not.toBeNull();
    expect(readMeta().owner).toBe("A");

    // B signs in on the same browser.
    syncPrefsOwner("B");

    // A's blob must be gone — cache cleared, both keys removed, versions
    // zeroed, owner now B.
    expect(getCache()).toBeNull();
    expect(localStorage.getItem(BLOB_KEY)).toBeNull();
    // META_KEY is re-written with the new owner + zeroed versions (so the
    // next session knows who the store belongs to) — the prefs blob itself
    // is gone, which is what kills the bleed.
    const meta = readMeta();
    expect(meta.v).toBe(0);
    expect(meta.sv).toBe(0);
    expect(meta.owner).toBe("B");

    // A subsequent load returns ONLY B's remote — no A slice survives.
    mockGet = async () => ({ caret: { style: "block" } });
    await loadPrefs();
    expect(readSlice("theme", { x: 1 })).toEqual({ x: 1 }); // A slice gone
    expect(readSlice("caret", {})).toEqual({ style: "block" });
    expect(readMeta().owner).toBe("B");
  });

  it("sign-out (A→null) clears the cache and keys, owner becomes null", async () => {
    mockGet = async () => ({});
    syncPrefsOwner("A");
    await loadPrefs();
    writeSlice("theme", { "--primary": "#aaaaaa" });

    syncPrefsOwner(null);

    expect(getCache()).toBeNull();
    expect(localStorage.getItem(BLOB_KEY)).toBeNull();
    // owner persisted as null in the rewritten META_KEY.
    expect(readMeta().owner ?? null).toBeNull();
  });

  it("anon→sign-in carries the anon prefs over (cache preserved)", async () => {
    // Anonymous user customises before signing in (owner stays null).
    writeSlice("theme", { "--primary": "#1e90ff" });
    expect(getCache()).toEqual({ theme: { "--primary": "#1e90ff" } });

    // They sign up / sign in.
    syncPrefsOwner("A");

    // The anon cache + localStorage must SURVIVE — A inherits the prefs.
    expect(getCache()).toEqual({ theme: { "--primary": "#1e90ff" } });
    expect(localStorage.getItem(BLOB_KEY)).not.toBeNull();
    expect(readMeta().owner).toBe("A");

    // The next load re-runs the GET and merges A's remote on top.
    mockGet = async () => ({ audio: { volume: 5 } });
    await loadPrefs();
    expect(readSlice("theme", {})).toEqual({ "--primary": "#1e90ff" });
    expect(readSlice("audio", {})).toEqual({ volume: 5 });
  });

  it("re-sign-in of the same user (A→A) is a no-op", async () => {
    mockGet = async () => ({});
    syncPrefsOwner("A");
    await loadPrefs();
    writeSlice("theme", { "--primary": "#aaaaaa" });
    const before = getCache();

    syncPrefsOwner("A");

    // Cache untouched, keys intact.
    expect(getCache()).toBe(before);
    expect(localStorage.getItem(BLOB_KEY)).not.toBeNull();
    expect(readMeta().owner).toBe("A");
  });
});
