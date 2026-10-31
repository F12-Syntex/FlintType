// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real prefs store against a fake account server. Signed out, every
// load is refused (as the real route answers 401). `gate` holds a load
// until it's released; `getFails` refuses every load (a network error).
let server: Record<string, unknown> = {};
let signedIn = false;
let gate: Promise<void> | null = null;
let getFails = false;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
vi.mock("@/lib/backend", () => ({
  useBackend: () => ({
    prefs: {
      get: async () => {
        const wasSignedIn = signedIn;
        if (gate) await gate;
        if (!wasSignedIn || getFails) throw new Error("401");
        return clone(server);
      },
      merge: async (input: { data: Record<string, unknown> }) => {
        if (!signedIn) throw new Error("401");
        server = { ...server, ...clone(input.data) };
        return { ok: true };
      },
    },
  }),
}));

import type { ImportGroup } from "@/types/settings-import";
import { DEFAULT_CARET } from "../caret-settings";
import { __resetForTests, prefsOwner, readSlice, syncPrefsOwner, writeSlice } from "../prefs-store";
import { applyItems, type ModeAccess } from "./apply";
import sample from "./fixtures/monkeytype-settings.json";
import { planMonkeytype } from "./monkeytype";
import { loadCurrentSettings } from "./slices";
import { createUndoPoint } from "./undo-point";

/** A review matched against one owner's store is never imported into
 *  another's: the dialog matches again (`runCheck`, `use-import-flow`)
 *  with `loadCurrentSettings`, which reads the new owner's settings. */

const ACCOUNT = { caret: { style: "block" }, behaviour: { stopOnError: true } };
const modeAccess: ModeAccess = { get: () => "light", set: () => {} };
const now = (plan: ReturnType<typeof planMonkeytype>, id: string) =>
  plan.groups.flatMap((g) => [...g.items, ...g.unchanged]).find((i) => i.id === id);

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  __resetForTests();
  server = clone(ACCOUNT);
  signedIn = false;
  gate = null;
  getFails = false;
});
afterEach(() => {
  vi.useRealTimers();
});

describe("loadCurrentSettings", () => {
  it("reads the account's settings when a sign-in lands while the store loads", async () => {
    let release = () => {};
    gate = new Promise<void>((r) => { release = r; });
    const loading = loadCurrentSettings(() => "light");
    signedIn = true;
    syncPrefsOwner("user_1"); // the session arrives from another tab
    gate = null;
    release();
    const { owner, current } = await loading;
    expect(owner).toBe("user_1");
    expect(current.slices.caret.style).toBe("block");
    expect(current.slices.behaviour.stopOnError).toBe(true);
  });

  it("never reads the old account's settings when a sign-out lands while the store loads", async () => {
    let release = () => {};
    gate = new Promise<void>((r) => { release = r; });
    signedIn = true;
    syncPrefsOwner("user_1"); // the account's copy starts loading
    const loading = loadCurrentSettings(() => "light");
    signedIn = false;
    syncPrefsOwner(null);
    gate = null;
    release();
    const { owner, current } = await loading;
    expect(owner).toBeNull();
    expect(current.slices.caret).toEqual(DEFAULT_CARET);
    expect(window.localStorage.getItem("flinttype:prefs:v1")).toBeNull();
  });
});

/** The account keeps what the import didn't set, and gets what it did. */
function expectMerged(account: Record<string, Record<string, unknown>>, groups: ImportGroup[]) {
  expect(server.caret).toEqual({ ...account.caret, smoothSpeed: 120 });
  expect(server.appearance).toMatchObject(account.appearance);
  expect(server.theme).toMatchObject(account.theme);
  for (const { target, value } of groups.flatMap((g) => g.items)) {
    if (target.kind === "slice") expect((server[target.slice] as Record<string, unknown>)[target.field]).toEqual(value);
    if (target.kind === "theme") expect((server.theme as Record<string, unknown>)[target.name]).toEqual(value);
  }
}

describe("a sign-in partway through an import", () => {
  const account = { caret: { style: "block", width: 3 }, appearance: { controlShape: "square" }, theme: { "--radius": "1rem" } };
  async function importFive(): Promise<ImportGroup[]> {
    server = clone(account);
    const { current } = await loadCurrentSettings(() => "light");
    const groups = planMonkeytype(sample, current, null).groups.slice(0, 5);
    const undo = createUndoPoint();
    for (const g of groups) applyItems(g.items, undo, modeAccess);
    return groups;
  }

  it("sends the import to the account only once the account's copy is merged in", async () => {
    const groups = await importFive();
    let release = () => {};
    gate = new Promise<void>((r) => { release = r; });
    signedIn = true;
    syncPrefsOwner("user_1"); // as in the app: nothing else loads
    await vi.advanceTimersByTimeAsync(1000); // past the debounce, with the account's copy still loading
    expect(server).toEqual(account);
    gate = null;
    release();
    await vi.advanceTimersByTimeAsync(1000);
    expectMerged(account, groups);
  });

  it("keeps the import waiting while the account's copy can't be loaded", async () => {
    const groups = await importFive();
    signedIn = true;
    getFails = true;
    syncPrefsOwner("user_1");
    await vi.advanceTimersByTimeAsync(1000);
    writeSlice("audio", { keypressClickEnabled: true }, ["keypressClickEnabled"]); // a later, unrelated edit
    await vi.advanceTimersByTimeAsync(1000);
    expect(server).toEqual(account);
    getFails = false;
    writeSlice("audio", { keypressClickEnabled: false }, ["keypressClickEnabled"]);
    await vi.advanceTimersByTimeAsync(1000);
    expectMerged(account, groups);
    expect(server.audio).toEqual({ keypressClickEnabled: false });
  });
});

describe("a review open across a sign-in", () => {
  it("is matched again against the account, so Import writes what the file says", async () => {
    const visitor = await loadCurrentSettings(() => "light");
    const stale = planMonkeytype(sample, visitor.current, null);
    // Against the visitor's defaults, these already matched the file.
    expect(now(stale, "caret.style")?.now).toBe(now(stale, "caret.style")?.to);

    signedIn = true;
    syncPrefsOwner("user_1");
    expect(prefsOwner()).not.toBe(visitor.owner); // the dialog sees this and matches again
    const account = await loadCurrentSettings(() => "light");
    const fresh = planMonkeytype(sample, account.current, null);
    expect(now(fresh, "caret.style")?.now).not.toBe(now(fresh, "caret.style")?.to);

    const undo = createUndoPoint();
    for (const g of fresh.groups) applyItems(g.items, undo, modeAccess);
    expect(readSlice<Record<string, unknown>>("caret", {}).style).toBe(now(fresh, "caret.style")?.value);
    expect(readSlice<Record<string, unknown>>("behaviour", {}).stopOnError).toBe(false);
  });
});
