// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real prefs store against a fake account server. Signed out, every
// load and save is refused (as the real routes answer 401). `hold`
// keeps a save in flight until it's released.
let server: Record<string, unknown> = {};
let signedIn = false;
let saves = 0;
let hold: Promise<void> | null = null;
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
vi.mock("@/lib/backend", () => ({
  useBackend: () => ({
    prefs: {
      get: async () => {
        if (!signedIn) throw new Error("401");
        return clone(server);
      },
      merge: async (input: { data: Record<string, unknown>; remove?: string[] }) => {
        if (hold) await hold;
        if (!signedIn) throw new Error("401");
        saves++;
        server = { ...server, ...clone(input.data) };
        for (const k of input.remove ?? []) delete server[k];
        return { ok: true };
      },
    },
  }),
}));

import { __resetForTests, getCache, loadPrefs, prefsOwner, syncPrefsOwner, writeSlice } from "../prefs-store";
import { applyItems, undoImport, type ModeAccess } from "./apply";
import sample from "./fixtures/monkeytype-settings.json";
import { planMonkeytype } from "./monkeytype";
import { readCurrentSettings } from "./slices";
import { canUndo, createUndoPoint } from "./undo-point";

/** An account with settings of its own, several in slices the sample
 *  file also writes. */
const ACCOUNT = {
  caret: { style: "block", smoothSpeed: 300, width: 3 },
  appearance: { highlightMode: "word", keymap: "static", controlShape: "square" },
  behaviour: { confidence: "word" },
  practice: { mode: "WORDS", length: 50 },
  theme: { "--primary": "#00ff00" },
  palette: { activeId: "nord" },
  selectedTags: ["og"],
};

let mode: string | null = "light";
const modeAccess: ModeAccess = { get: () => mode, set: (m) => { mode = m; } };
const settle = (ms = 1000) => vi.advanceTimersByTimeAsync(ms);

function importSample() {
  const undo = createUndoPoint();
  const plan = planMonkeytype(sample, readCurrentSettings(mode), null);
  for (const g of plan.groups) applyItems(g.items, undo, modeAccess);
  return undo;
}

/** A fresh page load (a reload, or a new tab). */
async function reload() {
  __resetForTests();
  await loadPrefs();
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  __resetForTests();
  server = clone(ACCOUNT);
  signedIn = false;
  saves = 0;
  hold = null;
  mode = "light";
});
afterEach(() => {
  vi.useRealTimers();
});

describe("a signed-out visitor who imports, undoes, then signs in", () => {
  /** A visitor on a new device does `work`, then signs in. */
  async function visitThenSignIn(work: () => Promise<void>) {
    window.localStorage.clear();
    __resetForTests();
    signedIn = false;
    server = clone(ACCOUNT);
    await loadPrefs();
    await work();
    await settle(); // every save is refused
    signedIn = true;
    syncPrefsOwner("user_1"); // as in the app: nothing else loads
    await settle(); // the carry-over save
    return { cache: clone(getCache()), server: clone(server) };
  }

  it("loses nothing on the account", async () => {
    const baseline = await visitThenSignIn(async () => {});
    const undone = await visitThenSignIn(async () => {
      await undoImport(importSample(), modeAccess);
    });
    expect(undone).toEqual(baseline);
    expect(undone.server).toEqual(ACCOUNT);
    expect(mode).toBe("light");
  });

  it("keeps the visitor's own changes, and the account's other fields", async () => {
    const own = async () => {
      writeSlice("appearance", { controlShape: "pill" }, ["controlShape"]);
      writeSlice("caret", { width: 4 }, ["width"]);
    };
    const baseline = await visitThenSignIn(own);
    const undone = await visitThenSignIn(async () => {
      await own();
      await undoImport(importSample(), modeAccess);
    });
    expect(undone).toEqual(baseline);
    expect(undone.cache?.appearance).toEqual({ highlightMode: "word", keymap: "static", controlShape: "pill" });
    expect(undone.cache?.caret).toEqual({ style: "block", smoothSpeed: 300, width: 4 });
  });

  it("is exact even when a refused save was still in flight at Undo", async () => {
    const baseline = await visitThenSignIn(async () => {});
    const undone = await visitThenSignIn(async () => {
      let release = () => {};
      hold = new Promise<void>((r) => { release = r; });
      const undo = importSample();
      await settle(500); // the import's save is sent, and held
      const done = undoImport(undo, modeAccess);
      hold = null;
      release(); // refused
      await done;
    });
    expect(undone).toEqual(baseline);
  });
});

describe("a signed-in user who undoes", () => {
  async function signedInAndSynced() {
    signedIn = true;
    await loadPrefs();
    await settle();
    return { cache: clone(getCache()), saves };
  }

  it("before the import was saved: nothing is sent, and the server stays authoritative", async () => {
    const before = await signedInAndSynced();
    await undoImport(importSample(), modeAccess); // inside the save's wait
    await settle();
    expect(saves).toBe(before.saves);
    expect(server).toEqual(ACCOUNT);
    // Another device changes a setting; the next load takes it.
    server = { ...server, caret: { ...ACCOUNT.caret, width: 9 } };
    await reload();
    expect(getCache()).toEqual({ ...before.cache, caret: { ...ACCOUNT.caret, width: 9 } });
  });

  it("after the import was saved: the server is put back too", async () => {
    const before = await signedInAndSynced();
    const undo = importSample();
    await settle();
    expect(server).not.toEqual(ACCOUNT); // the import reached the server
    await undoImport(undo, modeAccess);
    await settle();
    expect(server).toEqual(ACCOUNT);
    await reload();
    expect(getCache()).toEqual(before.cache);
  });

  it("while the import's save was in flight and then landed: the server is put back too", async () => {
    const before = await signedInAndSynced();
    let release = () => {};
    hold = new Promise<void>((r) => { release = r; });
    const undo = importSample();
    await settle(500); // the import's save is sent, and held
    const done = undoImport(undo, modeAccess);
    expect(getCache()).toEqual(before.cache); // the values are back at once
    hold = null;
    release(); // the import's save lands
    await done;
    await settle();
    expect(server).toEqual(ACCOUNT);
    await reload();
    expect(getCache()).toEqual(before.cache);
  });
});

describe("an Undo after the store changed owner", () => {
  it("visitor imports, signs in with Done still open: Undo writes nothing to the account", async () => {
    await loadPrefs();
    const undo = importSample();
    await settle(); // refused
    signedIn = true;
    syncPrefsOwner("user_1"); // the session arrives from another tab
    await settle(); // the carry-over save
    const carried = { cache: clone(getCache()), server: clone(server), saves };
    expect(canUndo(undo)).toBe(false);
    expect(undoImport(undo, modeAccess)).toBeNull();
    await settle();
    expect({ cache: getCache(), server, saves }).toEqual(carried);
    // The account's own fields the import didn't set are all still there.
    expect(server.caret).toMatchObject({ style: "block", width: 3 });
    expect(server.appearance).toMatchObject({ controlShape: "square" });
    expect(server.selectedTags).toEqual(["og"]);
    expect(mode).toBe("dark"); // the import's mode stays too
  });

  it("signed-in user imports, then signs out: Undo leaves the signed-out store empty", async () => {
    signedIn = true;
    syncPrefsOwner("user_1"); // as in the app: nothing else loads
    await settle();
    const undo = importSample();
    await settle();
    const saved = clone(server);
    signedIn = false;
    syncPrefsOwner(null);
    await loadPrefs();
    expect(prefsOwner()).toBeNull();
    expect(undoImport(undo, modeAccess)).toBeNull();
    await settle();
    expect(getCache()).toEqual({});
    expect(JSON.parse(window.localStorage.getItem("flinttype:prefs:v1") ?? "{}")).toEqual({});
    expect(server).toEqual(saved);
  });

  it("signs out while the Undo's save record settles: the new store's record is left alone", async () => {
    signedIn = true;
    syncPrefsOwner("user_1"); // as in the app: nothing else loads
    await settle();
    let release = () => {};
    hold = new Promise<void>((r) => { release = r; });
    const undo = importSample();
    await settle(500); // the import's save is sent, and held
    const done = undoImport(undo, modeAccess);
    expect(done).not.toBeNull();
    signedIn = false;
    syncPrefsOwner(null);
    await loadPrefs();
    writeSlice("caret", { width: 4 }, ["width"]); // the visitor's own edit
    hold = null;
    release(); // refused
    await done;
    const meta = JSON.parse(window.localStorage.getItem("flinttype:prefs:meta") ?? "{}");
    expect(meta.dirty).toEqual({ caret: ["width"] });
    expect(meta.v).toBe(1);
  });
});
