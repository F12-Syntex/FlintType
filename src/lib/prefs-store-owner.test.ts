// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real prefs store against fake account servers. `who` is the
// session the request carries (null signed out, so it's refused as the
// real route answers 401). `getFails` refuses every load, as a network
// error or a 401 at the moment of sign-in would. `hold` keeps the next
// save in flight until it's released; `failHeld` then refuses it.
const servers: Record<string, Record<string, unknown>> = {};
let who: string | null = null;
let getFails = false;
let hold: Promise<void> | null = null;
let failHeld = false;
const posts: { as: string; data: Record<string, unknown>; remove?: string[] }[] = [];
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
vi.mock("@/lib/backend", () => ({
  useBackend: () => ({
    prefs: {
      get: async () => {
        if (getFails || !who) throw new Error(getFails ? "network" : "401");
        return clone(servers[who] ?? {});
      },
      merge: async (input: { data: Record<string, unknown>; remove?: string[] }) => {
        const as = who;
        if (hold) {
          const h = hold;
          hold = null;
          await h;
          if (failHeld) throw new Error("network");
        }
        if (!as) throw new Error("401");
        posts.push({ as, ...clone(input) });
        const s = { ...(servers[as] ?? {}), ...clone(input.data) };
        for (const k of input.remove ?? []) delete s[k];
        servers[as] = s;
        return { ok: true };
      },
    },
  }),
}));

import {
  __resetForTests, clearSlice, flushPrefs, getCache, loadPrefs, prefsMergePending, syncPrefsOwner, writeSlice,
} from "./prefs-store";

/** A sign-in carries a visitor's edits into the account only once the
 *  account's own copy is merged in, however long that takes; and a save
 *  from before a reset never touches the next owner's store. */

const ACCOUNT = {
  caret: { style: "block", smoothSpeed: 300, width: 3 },
  appearance: { highlightMode: "word", controlShape: "square" },
};
const settle = (ms = 2000) => vi.advanceTimersByTimeAsync(ms);
const edit = (key: string, field: string, value: unknown) =>
  writeSlice(key, { ...((getCache()?.[key] as object) ?? {}), [field]: value }, [field]);

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  __resetForTests();
  for (const k of Object.keys(servers)) delete servers[k];
  servers.user_1 = clone(ACCOUNT);
  who = null;
  getFails = false;
  hold = null;
  failHeld = false;
  posts.length = 0;
});
afterEach(() => {
  vi.useRealTimers();
});

/** A visitor changes the caret's smooth speed, then signs in while
 *  every load fails. Nothing in the app loads again after the sign-in. */
async function signInWhileLoadsFail() {
  await loadPrefs();
  edit("caret", "smoothSpeed", 120);
  who = "user_1";
  getFails = true;
  syncPrefsOwner("user_1");
  await settle();
}

describe("a sign-in whose merge load fails", () => {
  it("sends nothing, even after later edits, while the account's copy can't be loaded", async () => {
    await signInWhileLoadsFail();
    expect(prefsMergePending()).toBe(true); // the import dialog won't match against this store
    expect(posts).toEqual([]);
    edit("audio", "keypressClickEnabled", true);
    await settle();
    expect(posts).toEqual([]);
    expect(servers.user_1).toEqual(ACCOUNT);
  });

  it("sends the carried-over fields once a load lands, and the account keeps the rest", async () => {
    await signInWhileLoadsFail();
    edit("audio", "keypressClickEnabled", true);
    await settle();
    getFails = false;
    edit("audio", "keypressClickVolume", 40); // the next save retries the merge
    await settle();
    expect(servers.user_1.caret).toEqual({ ...ACCOUNT.caret, smoothSpeed: 120 });
    expect(servers.user_1.appearance).toEqual(ACCOUNT.appearance);
    expect(servers.user_1.audio).toEqual({ keypressClickEnabled: true, keypressClickVolume: 40 });
    expect(prefsMergePending()).toBe(false);
  });

  it("still waits for the merge after a reload", async () => {
    await signInWhileLoadsFail();
    __resetForTests(); // a reload: only localStorage survives
    await loadPrefs();
    edit("audio", "keypressClickEnabled", true);
    await settle();
    expect(posts).toEqual([]);
    getFails = false;
    await loadPrefs();
    await settle();
    expect(servers.user_1.caret).toEqual({ ...ACCOUNT.caret, smoothSpeed: 120 });
    expect(servers.user_1.appearance).toEqual(ACCOUNT.appearance);
  });
});

describe("a save in flight across an owner change", () => {
  it("leaves its slices and removals out of the next owner's store when it fails", async () => {
    servers.user_1 = { background: { imageUrl: "https://a/1.png" }, caret: { style: "block" } };
    servers.user_2 = { background: { imageUrl: "https://b/2.png", fit: "contain" }, caret: { style: "underline", width: 4 } };
    who = "user_1";
    syncPrefsOwner("user_1");
    await settle();
    clearSlice("background");
    edit("caret", "width", 2);
    let release = () => {};
    hold = new Promise<void>((r) => { release = r; });
    failHeld = true;
    await settle(450); // the save is in flight
    who = null;
    syncPrefsOwner(null); // sign out
    release();
    await settle();
    expect(JSON.parse(localStorage.getItem("flinttype:prefs:meta") ?? "{}")).toMatchObject({ d: [], r: [] });
    await loadPrefs();
    edit("caret", "style", "line");
    await settle();
    who = "user_2";
    syncPrefsOwner("user_2");
    await settle();
    expect(posts.filter((p) => p.as === "user_2").map((p) => [Object.keys(p.data), p.remove ?? []])).toEqual([[["caret"], []]]);
    expect(servers.user_2.background).toEqual({ imageUrl: "https://b/2.png", fit: "contain" });
    expect(servers.user_2.caret).toEqual({ style: "line", width: 4 });
  });

  it("flushPrefs reports nothing saved when the store resets while it waits", async () => {
    who = "user_1";
    syncPrefsOwner("user_1");
    await settle();
    edit("caret", "width", 2);
    let release = () => {};
    hold = new Promise<void>((r) => { release = r; });
    await settle(450); // a save is in flight
    edit("caret", "style", "line");
    const result = flushPrefs(); // waits for the save in flight first
    who = null;
    syncPrefsOwner(null); // sign out: the store it was saving is gone
    await loadPrefs(); // the new store has a cache, so it has nothing to send
    release();
    await settle();
    expect(await result).toBe(false);
  });

  it("keeps a visitor's refused save for the account it signs in to", async () => {
    await loadPrefs();
    edit("caret", "smoothSpeed", 120);
    let release = () => {};
    hold = new Promise<void>((r) => { release = r; });
    await settle(450); // the visitor's save is in flight
    edit("audio", "keypressClickEnabled", true);
    who = "user_1";
    syncPrefsOwner("user_1");
    release(); // refused: it was sent signed out
    await settle();
    expect(servers.user_1.caret).toEqual({ ...ACCOUNT.caret, smoothSpeed: 120 });
    expect(servers.user_1.audio).toEqual({ keypressClickEnabled: true });
    expect(servers.user_1.appearance).toEqual(ACCOUNT.appearance);
  });
});
