// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real prefs store against a fake account server (as in
// undo-sync.test.ts). Signed out, every load and save is refused.
// `hold` keeps a save in flight until it's released.
let server: Record<string, unknown> = {};
let signedIn = false;
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
        server = { ...server, ...clone(input.data) };
        for (const k of input.remove ?? []) delete server[k];
        return { ok: true };
      },
    },
  }),
}));

import { __resetForTests, clearSlice, getCache, loadPrefs, syncPrefsOwner, writeSlice } from "../prefs-store";
import { applyItems, undoImport, type ModeAccess } from "./apply";
import sample from "./fixtures/monkeytype-settings.json";
import { planMonkeytype } from "./monkeytype";
import { readCurrentSettings } from "./slices";
import { createUndoPoint } from "./undo-point";

/** Writes made by someone else (the command palette over the Done
 *  screen, another control) to settings the import didn't write, while
 *  it can still be undone. Undo puts back the settings the import wrote
 *  and takes back only its own save bookkeeping; theirs is saved. */

const ACCOUNT = {
  caret: { style: "block", smoothSpeed: 300, width: 3 },
  appearance: { highlightMode: "word", keymap: "static", controlShape: "square" },
  practice: { mode: "WORDS", length: 50 },
};

let mode: string | null = "light";
const modeAccess: ModeAccess = { get: () => mode, set: (m) => { mode = m; } };
const settle = (ms = 1000) => vi.advanceTimersByTimeAsync(ms);
const caretNow = () => (getCache()?.caret ?? {}) as Record<string, unknown>;
/** Someone else changes one caret field, as a settings control does. */
const otherCaretWrite = (field: string, value: unknown) => writeSlice("caret", { ...caretNow(), [field]: value }, [field]);

function importSample() {
  const undo = createUndoPoint();
  const plan = planMonkeytype(sample, readCurrentSettings(mode), null);
  for (const g of plan.groups) applyItems(g.items, undo, modeAccess);
  return undo;
}

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
  hold = null;
  mode = "light";
});
afterEach(() => {
  vi.useRealTimers();
});

describe("signed in", () => {
  async function synced() {
    signedIn = true;
    syncPrefsOwner("user_1"); // as in the app: nothing else loads
    await settle();
  }

  it("a field someone else set in a slice the import touched is still saved, and survives a reload", async () => {
    await synced();
    const undo = importSample();
    otherCaretWrite("radius", 9);
    await undoImport(undo, modeAccess);
    await settle();
    expect(server.caret).toEqual({ ...ACCOUNT.caret, radius: 9 });
    expect(server.appearance).toEqual(ACCOUNT.appearance);
    await reload();
    expect(getCache()?.caret).toEqual({ ...ACCOUNT.caret, radius: 9 });
  });

  it("a write in a slice the import didn't touch is saved", async () => {
    await synced();
    const undo = importSample();
    writeSlice("keyboard", { design: "glass" }, ["design"]);
    await undoImport(undo, modeAccess);
    await settle();
    expect(server.keyboard).toEqual({ design: "glass" });
  });

  it("a write made while the Undo's save record settles is saved", async () => {
    await synced();
    let release = () => {};
    hold = new Promise<void>((r) => { release = r; });
    const undo = importSample();
    await settle(500); // the import's save is sent, and held
    const done = undoImport(undo, modeAccess);
    otherCaretWrite("blinkSpeed", 0);
    hold = null;
    release();
    await done;
    await settle();
    expect(server.caret).toEqual({ ...ACCOUNT.caret, blinkSpeed: 0 });
  });
});

describe("signed out, then signing in", () => {
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

  it("the account gets the field someone else set, and keeps its own other fields", async () => {
    const own = async () => otherCaretWrite("blinkSpeed", 1500);
    const baseline = await visitThenSignIn(own);
    const undone = await visitThenSignIn(async () => {
      const undo = importSample();
      await own();
      await undoImport(undo, modeAccess);
    });
    expect(undone).toEqual(baseline);
    expect(undone.server.caret).toEqual({ ...ACCOUNT.caret, blinkSpeed: 1500 });
    expect(undone.server.appearance).toEqual(ACCOUNT.appearance);
  });

  it("a write made while the Undo's save record settles reaches the account", async () => {
    const own = async () => otherCaretWrite("blinkSpeed", 0);
    const baseline = await visitThenSignIn(own);
    const undone = await visitThenSignIn(async () => {
      let release = () => {};
      hold = new Promise<void>((r) => { release = r; });
      const undo = importSample();
      await settle(500); // the import's save is sent, and held
      const done = undoImport(undo, modeAccess);
      await own();
      hold = null;
      release(); // refused
      await done;
    });
    expect(undone).toEqual(baseline);
    expect(undone.server.caret).toEqual({ ...ACCOUNT.caret, blinkSpeed: 0 });
  });

  it("a slice someone else reset stays reset, exactly as without the import", async () => {
    const reset = async () => clearSlice("caret");
    const baseline = await visitThenSignIn(async () => {
      otherCaretWrite("width", 4);
      await reset();
    });
    const undone = await visitThenSignIn(async () => {
      otherCaretWrite("width", 4);
      const undo = importSample();
      await reset();
      await undoImport(undo, modeAccess);
      expect(getCache()?.caret).toBeUndefined();
    });
    expect(undone).toEqual(baseline);
  });
});
