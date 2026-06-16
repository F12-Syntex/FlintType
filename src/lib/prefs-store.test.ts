// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Backend stubs the store calls into. Tests reassign these per case. */
let mockGet: () => Promise<unknown>;
let mockMerge: (input: unknown) => Promise<unknown>;

vi.mock("@/lib/backend", () => ({
  useBackend: () => ({
    prefs: {
      get: () => mockGet(),
      merge: (input: unknown) => mockMerge(input),
    },
  }),
}));

import {
  __resetForTests,
  clearSlice,
  loadPrefs,
  readSlice,
  writeSlice,
} from "./prefs-store";

const BLOB_KEY = "flinttype:prefs:v1";
const META_KEY = "flinttype:prefs:meta";

function readMeta(): { v: number; sv: number; d?: string[]; r?: string[] } {
  return JSON.parse(localStorage.getItem(META_KEY) ?? '{"v":0,"sv":0}');
}

describe("prefs-store conflict resolution", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    __resetForTests();
    mockGet = async () => ({});
    mockMerge = async () => ({ ok: true });
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
    mockMerge = async (input) => {
      saved = input;
      return { ok: true };
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

  it("flush sends only the dirty slices, never the whole blob", async () => {
    // The server holds slices the client never touched (incl. a
    // server-owned one) — they must not travel back in the patch.
    mockGet = async () => ({
      caret: { style: "line" },
      selectedTags: ["og"],
    });
    const sent: unknown[] = [];
    mockMerge = async (input) => {
      sent.push(input);
      return { ok: true };
    };
    await loadPrefs();

    writeSlice("theme", { "--primary": "#1e90ff" });
    await vi.runAllTimersAsync();

    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({ data: { theme: { "--primary": "#1e90ff" } } });
  });

  it("clearSlice flushes a remove instead of resending the slice", async () => {
    mockGet = async () => ({ caret: { style: "block" } });
    const sent: unknown[] = [];
    mockMerge = async (input) => {
      sent.push(input);
      return { ok: true };
    };
    await loadPrefs();

    clearSlice("caret");
    await vi.runAllTimersAsync();

    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({ data: {}, remove: ["caret"] });
  });

  it("a failed flush keeps the slice dirty so the next flush retries it", async () => {
    mockGet = async () => ({});
    const sent: unknown[] = [];
    let fail = true;
    mockMerge = async (input) => {
      if (fail) throw new Error("offline");
      sent.push(input);
      return { ok: true };
    };
    await loadPrefs();

    writeSlice("theme", { "--primary": "#1e90ff" });
    await vi.runAllTimersAsync(); // flush fails

    fail = false;
    writeSlice("behaviour", { stopOnError: true });
    await vi.runAllTimersAsync();

    // Retry carries both the previously-failed slice and the new one.
    expect(sent).toHaveLength(1);
    expect(sent[0]).toEqual({
      data: {
        theme: { "--primary": "#1e90ff" },
        behaviour: { stopOnError: true },
      },
    });
  });

  it("a clearSlice racing a failed in-flight flush leaves the key removed-only", async () => {
    mockGet = async () => ({});
    // Deferred merge so we can clear the slice while the flush is in flight.
    let rejectMerge: (e: Error) => void = () => {};
    mockMerge = () =>
      new Promise((_resolve, reject) => {
        rejectMerge = reject;
      });
    await loadPrefs();

    writeSlice("theme", { "--primary": "#1e90ff" });
    await vi.advanceTimersByTimeAsync(500); // flush starts, merge pending

    // User resets the slice while the dirty flush is still in flight.
    clearSlice("theme");
    rejectMerge(new Error("offline"));
    await Promise.resolve(); // let the catch block settle
    await Promise.resolve();

    // The latest intent is "removed" — the failed dirty send must not
    // resurrect the key into dirtyKeys.
    const meta = readMeta();
    expect(meta.r).toEqual(["theme"]);
    expect(meta.d).toEqual([]);
  });

  it("a writeSlice racing a failed in-flight remove leaves the key dirty-only", async () => {
    mockGet = async () => ({ theme: { "--primary": "#f97316" } });
    let rejectMerge: (e: Error) => void = () => {};
    mockMerge = () =>
      new Promise((_resolve, reject) => {
        rejectMerge = reject;
      });
    await loadPrefs();

    clearSlice("theme");
    await vi.advanceTimersByTimeAsync(500); // remove flush in flight

    // User writes the slice again while the remove is still in flight.
    writeSlice("theme", { "--primary": "#1e90ff" });
    rejectMerge(new Error("offline"));
    await Promise.resolve();
    await Promise.resolve();

    // The newer write supersedes the older remove.
    const meta = readMeta();
    expect(meta.d).toEqual(["theme"]);
    expect(meta.r).toEqual([]);
  });
});
