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
  loadPrefs,
  readSlice,
  writeSlice,
} from "./prefs-store";

const BLOB_KEY = "flinttype:prefs:v1";
const META_KEY = "flinttype:prefs:meta";

function readMeta(): { v: number; sv: number } {
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
