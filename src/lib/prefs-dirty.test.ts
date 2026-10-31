// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  changedSince, keepOthers, overlayFields, parseMeta, restoreSliceSync, sliceSyncOf, wholeSliceFields,
  type SliceSync, type SyncSets,
} from "./prefs-dirty";

/** Backend stubs the store calls into (as in prefs-store.test.ts). */
let mockGet: () => Promise<unknown>;
let mockMerge: (input: unknown) => Promise<unknown>;
let saves = 0;

vi.mock("@/lib/backend", () => ({
  useBackend: () => ({
    prefs: {
      get: () => mockGet(),
      merge: (input: unknown) => {
        saves++;
        return mockMerge(input);
      },
    },
  }),
}));

import {
  __resetForTests, clearSlice, flushPrefs, getCache, loadPrefs, prefsVersion, readSlice, restoreSync, sliceSync,
  syncPrefsOwner, writeSlice,
} from "./prefs-store";

const META = "flinttype:prefs:meta";

beforeEach(() => { // every store test starts empty, on fake timers
  vi.useFakeTimers();
  localStorage.clear();
  __resetForTests();
  saves = 0;
  mockGet = async () => ({});
  mockMerge = async () => ({ ok: true });
});
afterEach(() => vi.useRealTimers());

describe("overlayFields", () => {
  it("takes the named fields from the local slice and the rest from the server", () => {
    const base = { a: 1, b: 2, c: 3 };
    expect(overlayFields(base, { a: 10, b: 20 }, ["a"])).toEqual({ a: 10, b: 2, c: 3 });
    expect(base).toEqual({ a: 1, b: 2, c: 3 });
  });

  it("removes a named field the local slice no longer has", () => {
    expect(overlayFields({ a: 1, "--primary": "#f00" }, { a: 1 }, ["--primary"])).toEqual({ a: 1 });
  });

  it("adds a named field the server never had", () => {
    expect(overlayFields({}, { a: undefined, b: 0 }, ["a", "b"])).toEqual({ a: undefined, b: 0 });
  });

  it("never reads a field through Object.prototype", () => {
    expect(overlayFields({ a: 1 }, {}, ["toString"])).toEqual({ a: 1 });
  });
});

describe("wholeSliceFields", () => {
  it("names every field the new value has", () => {
    expect(wholeSliceFields({ a: 1, b: 2 }, undefined)).toEqual(["a", "b"]);
  });

  it("also names the fields the write dropped, once each", () => {
    expect(wholeSliceFields({ a: 1 }, { a: 0, gone: true })).toEqual(["a", "gone"]);
  });

  it("names nothing for a value that isn't an object", () => {
    expect(wholeSliceFields(null, { a: 1 })).toEqual([]);
    expect(wholeSliceFields(["a"], undefined)).toEqual([]);
    expect(wholeSliceFields({ a: 1 }, ["x"])).toEqual(["a"]);
  });
});

describe("removed fields through the store, across a reload", () => {
  /** Load from the server, then make every save fail (offline, or the
   *  tab closed in the debounce). */
  async function syncedThenOffline(server: Record<string, unknown>) {
    mockGet = async () => server;
    await loadPrefs();
    await vi.runAllTimersAsync();
    mockMerge = () => Promise.reject(new Error("offline"));
  }

  /** Reload the page with the server still behind. */
  async function reload() {
    await vi.runAllTimersAsync();
    __resetForTests();
    mockMerge = async () => ({ ok: true });
    await loadPrefs();
  }

  it("a dirty field removed locally stays removed when the server still has it", async () => {
    await syncedThenOffline({ theme: { "--primary": "#123456", "--card": "#222222" } });
    writeSlice("theme", { "--card": "#222222" }, ["--primary"]);
    await reload();
    expect(readSlice("theme", {})).toEqual({ "--card": "#222222" });
  });

  it("a whole-slice write that drops a field keeps it dropped", async () => {
    await syncedThenOffline({ palette: { activeId: "custom", base: { id: "nord" } } });
    writeSlice("palette", { activeId: "nord" });
    await reload();
    expect(readSlice("palette", {})).toEqual({ activeId: "nord" });
  });
});

describe("parseMeta", () => {
  const clean = { v: 0, sv: 0, owner: null, d: [], r: [], dirty: {}, removed: [] };

  it("reads a stored record", () => {
    const raw = JSON.stringify({ v: 3, sv: 2, owner: "u1", d: ["a"], r: ["b"], dirty: { a: ["x"] }, removed: ["b"] });
    expect(parseMeta(raw)).toEqual({ v: 3, sv: 2, owner: "u1", d: ["a"], r: ["b"], dirty: { a: ["x"] }, removed: ["b"] });
  });

  it("reads anything unreadable as clean", () => {
    for (const raw of [null, "", "{", "[]", "null", JSON.stringify({ v: 1 })]) expect(parseMeta(raw)).toEqual(clean);
  });

  it("reads an old record without an owner as anonymous, and drops stray entries", () => {
    const raw = JSON.stringify({ v: 1, sv: 0, d: ["a", 2], dirty: { a: ["x", 1], b: "y", __proto__: ["z"] } });
    const meta = parseMeta(raw);
    expect(meta).toMatchObject({ owner: null, d: ["a"], dirty: { a: ["x"] } });
    expect(Object.getPrototypeOf(meta.dirty)).toBe(Object.prototype);
  });
});

describe("a slice's save record", () => {
  const sets = (): SyncSets => ({ dirty: {}, dirtyKeys: new Set(), removedKeys: new Set(), removed: new Set() });

  it("is put back exactly as it was read", () => {
    const s = sets();
    s.dirty.a = ["x"];
    s.dirtyKeys.add("a");
    const priorA = sliceSyncOf(s, "a");
    const priorB = sliceSyncOf(s, "b");
    s.dirty.a.push("y");
    s.dirty.b = ["z"];
    s.removedKeys.add("b");
    s.removed.add("b");
    restoreSliceSync(s, "a", priorA);
    restoreSliceSync(s, "b", priorB);
    expect(s).toEqual({ dirty: { a: ["x"] }, dirtyKeys: new Set(["a"]), removedKeys: new Set(), removed: new Set() });
  });
});

describe("someone else's changes to a slice's record", () => {
  const rec = (fields: string[] | undefined, more: Partial<SliceSync> = {}): SliceSync => ({
    ...(fields ? { fields } : {}), send: false, remove: false, reset: false, ...more,
  });

  it("are the fields newly marked, and a new reset", () => {
    expect(changedSince(rec(["a"]), rec(["a", "b"], { send: true }))).toEqual({ fields: ["b"], reset: false });
    expect(changedSince(rec(["a"]), rec(undefined, { remove: true, reset: true }))).toEqual({ fields: [], reset: true });
  });

  it("never include a save landing, which only takes marks away", () => {
    expect(changedSince(rec(["a", "b"], { send: true, reset: true }), rec(["b"]))).toEqual({ fields: [], reset: false });
  });

  it("stay marked and sent on top of the record put back", () => {
    expect(keepOthers(rec(["a"]), ["b", "a"])).toEqual(rec(["a", "b"], { send: true }));
    expect(keepOthers(rec(undefined, { reset: true }), ["b"])).toEqual(rec(["b"], { send: true, reset: true }));
    const prior = rec(undefined);
    expect(keepOthers(prior, [])).toBe(prior);
  });
});

describe("restoreSync through the store", () => {
  beforeEach(() => void (mockGet = async () => ({ a: { kept: 1 } })));

  /** Write and take back a field on `a` and a new slice `b`. */
  function batch() {
    const since = prefsVersion();
    const prior = new Map([["a", sliceSync("a")], ["b", sliceSync("b")]]);
    writeSlice("a", { kept: 1, added: 2 }, ["added"]);
    writeSlice("b", { y: 1 });
    writeSlice("a", { kept: 1 }, ["added"]);
    clearSlice("b");
    return { since, prior };
  }

  it("leaves no tombstone and nothing to save, and nothing is sent", async () => {
    await loadPrefs();
    const metaBefore = localStorage.getItem(META);
    const { since, prior } = batch();
    expect(restoreSync(since, 4, prior)).toBe(true);
    expect(JSON.parse(localStorage.getItem(META)!)).toEqual({
      ...JSON.parse(metaBefore ?? JSON.stringify({ v: 0, sv: 0, owner: null })), d: [], r: [], dirty: {}, removed: [],
    });
    await vi.advanceTimersByTimeAsync(1000);
    expect(saves).toBe(0);
  });

  it("does nothing once a save after the batch began was confirmed", async () => {
    await loadPrefs();
    const since = prefsVersion();
    const prior = new Map([["a", sliceSync("a")]]);
    writeSlice("a", { kept: 1, added: 2 }, ["added"]);
    await vi.advanceTimersByTimeAsync(1000); // saved
    writeSlice("a", { kept: 1 }, ["added"]);
    expect(restoreSync(since, 2, prior)).toBe(false);
    expect(JSON.parse(localStorage.getItem(META)!).dirty).toEqual({ a: ["added"] });
  });

  it("keeps the stamp ahead when something else wrote meanwhile", async () => {
    await loadPrefs();
    const { since, prior } = batch();
    writeSlice("c", { other: true }, ["other"]);
    restoreSync(since, 4, prior);
    expect(prefsVersion()).toBe(since + 5);
    expect(JSON.parse(localStorage.getItem(META)!).dirty).toEqual({ c: ["other"] });
  });

  it("a save with nothing to send never holds up the next one", async () => {
    await loadPrefs();
    const { since, prior } = batch();
    restoreSync(since, 4, prior);
    await vi.advanceTimersByTimeAsync(1000); // the pending save has nothing to send
    writeSlice("c", { other: true }, ["other"]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(saves).toBe(1);
  });
});

describe("the store across a sign-in or sign-out", () => {
  // A fake account server: signed out, it refuses every load and save.
  let server: Record<string, unknown>;
  let signedIn = false;
  let getMs = 0;
  let hold: Promise<void> | null = null;
  /** Sign in as the app does: nothing but the store itself loads. */
  const signIn = (ms = 0) => {
    [signedIn, getMs] = [true, ms];
    syncPrefsOwner("user_1");
  };
  const caret = (patch: object, fields: string[]) => writeSlice("caret", { ...readSlice("caret", {}), ...patch }, fields);
  beforeEach(() => {
    server = { caret: { style: "block", smoothSpeed: 300, width: 3 } };
    [signedIn, getMs, hold] = [false, 0, null];
    mockGet = async () => {
      const was = signedIn;
      if (getMs) await new Promise((r) => setTimeout(r, getMs));
      return was ? structuredClone(server) : Promise.reject(new Error("401"));
    };
    mockMerge = async (input) => {
      if (hold) await hold;
      if (!signedIn) throw new Error("401");
      server = { ...server, ...structuredClone((input as { data: object }).data) };
      return { ok: true };
    };
  });

  it.each([0, 150, 1000])("a visitor's edit reaches the account, whose other fields survive (GET %i ms)", async (ms) => {
    await loadPrefs();
    caret({ smoothSpeed: 120 }, ["smoothSpeed"]); // its save is still pending
    signIn(ms);
    await vi.advanceTimersByTimeAsync(3000);
    expect(server.caret).toEqual({ style: "block", smoothSpeed: 120, width: 3 });
    expect(readSlice("caret", {})).toEqual(server.caret);
  });

  it("drops a load that was for the owner before a sign-out", async () => {
    signIn(1000); // its load is in flight
    signedIn = false;
    syncPrefsOwner(null);
    await vi.advanceTimersByTimeAsync(1000);
    expect([getCache(), localStorage.getItem("flinttype:prefs:v1")]).toEqual([null, null]);
  });

  it("flushPrefs sends at once, after the account's copy is in, and says whether it was confirmed", async () => {
    await loadPrefs();
    caret({ smoothSpeed: 120 }, ["smoothSpeed"]);
    signIn(1000);
    const sending = flushPrefs();
    await vi.advanceTimersByTimeAsync(1000); // the GET lands, then the save goes out at once
    expect(await sending).toBe(true);
    expect(server.caret).toEqual({ style: "block", smoothSpeed: 120, width: 3 });
    signedIn = false; // the session ran out
    caret({ width: 1 }, ["width"]);
    expect(await flushPrefs()).toBe(false);
  });

  it("a save confirmed after a sign-out leaves the new store's record alone", async () => {
    signIn();
    await vi.advanceTimersByTimeAsync(0);
    let release = () => {};
    hold = new Promise<void>((r) => { release = r; });
    caret({ style: "line" }, ["style"]);
    const sending = flushPrefs();
    await vi.advanceTimersByTimeAsync(0);
    syncPrefsOwner(null); // signed out while the save is in flight
    release();
    expect(await sending).toBe(true);
    expect(JSON.parse(localStorage.getItem(META)!)).toMatchObject({ v: 0, sv: 0, owner: null });
  });
});
