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

describe("prefs-store field-granular dirty tracking (FT-013)", () => {
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

  it("fresh device, one field edited during GET in flight: untouched remote fields survive", async () => {
    // Fresh device: empty localStorage, cache null. The GET returns a
    // populated slice but resolves only after we make a local edit.
    let resolveGet: (v: unknown) => void = () => {};
    const getReady = new Promise<unknown>((res) => {
      resolveGet = res;
    });
    mockGet = () => getReady;

    // Kick off the load; do NOT await yet (GET is in flight).
    const loaded = loadPrefs();

    // User flips ONE field while the GET is in flight. cache is null, so
    // readSlice returns bare defaults; writeSlice persists defaults+patch
    // and bumps localVersion 0 -> 1, marking only `fontSize` dirty.
    const defaults = { a: 0, b: 0, c: 0, fontSize: "normal" };
    writeSlice(
      "appearance",
      { ...defaults, fontSize: "large" },
      ["fontSize"],
    );

    // Now the server responds with the user's real, populated slice.
    resolveGet({ appearance: { a: 1, b: 2, c: 3, fontSize: "normal" } });
    await loaded;

    const slice = readSlice("appearance", {});
    // The single user edit is applied...
    expect(slice).toMatchObject({ fontSize: "large" });
    // ...and every OTHER server-populated field survives (the FT-013 bug
    // would have replaced the whole slice with defaults+patch, losing
    // a/b/c's real values).
    expect(slice).toMatchObject({ a: 1, b: 2, c: 3 });
  });

  it("theme-revert still preserved: an unsynced edited field wins over a stale remote value", async () => {
    localStorage.setItem(
      BLOB_KEY,
      JSON.stringify({ theme: { "--primary": "#1e90ff", "--bg": "#000000" } }),
    );
    // Field-granular meta: only --primary was touched.
    localStorage.setItem(
      META_KEY,
      JSON.stringify({
        v: 1,
        sv: 0,
        dirty: { theme: ["--primary"] },
        removed: [],
      }),
    );
    // Server is behind on --primary but newer on --bg.
    mockGet = async () => ({ theme: { "--primary": "#f97316", "--bg": "#222222" } });

    await loadPrefs();

    const slice = readSlice("theme", {});
    // The touched field still wins over the stale server copy...
    expect(slice).toMatchObject({ "--primary": "#1e90ff" });
    // ...while the untouched field flows in from the (newer) server.
    expect(slice).toMatchObject({ "--bg": "#222222" });
  });

  it("post-sync: dirty cleared, a newer remote value for an untouched field flows in", async () => {
    mockGet = async () => ({ appearance: { fontSize: "normal", theme: "x" } });
    await loadPrefs();

    // Edit one field; flush the debounced save.
    writeSlice("appearance", { fontSize: "large", theme: "x" }, ["fontSize"]);
    await vi.runAllTimersAsync();

    const meta = readMeta();
    expect(meta.sv).toBe(meta.v); // synced — dirty should now be cleared

    // Reload: the server (e.g. another device) now has a different value
    // for the SAME field we edited. Since dirty was cleared on confirm,
    // the device is clean and the server is authoritative again.
    __resetForTests();
    mockGet = async () => ({ appearance: { fontSize: "huge", theme: "y" } });
    await loadPrefs();

    expect(readSlice("appearance", {})).toEqual({ fontSize: "huge", theme: "y" });
  });

  it("functional-patch update marks only the changed field dirty", async () => {
    mockGet = async () => ({ appearance: { a: 1, b: 2, c: 3 } });
    await loadPrefs();
    await vi.runAllTimersAsync();
    __resetForTests();

    // Re-seed as a fresh device whose GET is in flight, mirroring the
    // hook's functional-update path via writeSlice with a diffed field.
    let resolveGet: (v: unknown) => void = () => {};
    const getReady = new Promise<unknown>((res) => {
      resolveGet = res;
    });
    mockGet = () => getReady;
    const loaded = loadPrefs();

    // Functional update touched only `b` (cur is bare defaults here).
    writeSlice("appearance", { a: 0, b: 9, c: 0 }, ["b"]);

    resolveGet({ appearance: { a: 1, b: 2, c: 3 } });
    await loaded;

    const slice = readSlice("appearance", {});
    expect(slice).toMatchObject({ a: 1, b: 9, c: 3 });
  });
});
