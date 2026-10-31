import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImportGroup, ImportPlan } from "@/types/settings-import";
import { SAVE_WAIT_MS, STAGE_SETTLE_MS } from "./flow-timing";
import { flowReducer, initialFlow, type FlowAction, type FlowState } from "./import-stage";
import { resultCopy } from "./result-copy";
import { runImport, type ImportRunDeps } from "./run-import";

const item = (id: string) => ({ id, label: id, now: "a", to: "b", target: { kind: "mode" as const }, value: "dark" });
const GROUPS: ImportGroup[] = ["A", "B", "C"].map((name, i) => ({
  id: name.toLowerCase(), name, items: Array.from({ length: i + 1 }, (_, j) => item(`${name}${j}`)), unchanged: [],
}));
const PLAN: ImportPlan = { source: "monkeytype", fileLabel: null, settingsInFile: 6, groups: GROUPS, skipped: [] };

/** Runs the import against the real reducer. The owner changes at the
 *  `ownerMovesAt`-th sleep (0-based): the pause after each group, then
 *  the settle before Done. `hang`: the save never answers. A wait for
 *  the save's answer shows in `order` as "wait". */
async function play({ ownerMovesAt = -1, kept = false, failAt = -1, saved = true, hang = false } = {}) {
  let state: FlowState = flowReducer(initialFlow("monkeytype"), { type: "review", plan: PLAN });
  state = flowReducer(state, { type: "apply", groups: GROUPS.map((g) => g.id), labels: GROUPS.map((g) => g.name) });
  let owner = true;
  let sleeps = 0;
  const written: string[] = [];
  let undone = false;
  const order: string[] = [];
  const deps: ImportRunDeps = {
    apply: (items) => {
      if (!owner) throw new Error("wrote into someone else's store");
      if (written.length === failAt) throw new Error("write failed");
      written.push(items[0].id);
    },
    undoAll: () => { undone = true; },
    stillOwner: () => owner,
    kept: () => kept,
    save: () => {
      order.push("save");
      return hang ? new Promise<boolean>(() => {}) : Promise.resolve(saved);
    },
    sleep: async (ms) => {
      order.push(ms === SAVE_WAIT_MS ? "wait" : "sleep");
      if (sleeps++ === ownerMovesAt) owner = false;
    },
    dispatch: (a: FlowAction) => {
      if (a.type === "done") order.push("done");
      state = flowReducer(state, a);
    },
  };
  const end = await runImport(GROUPS, { pauseMs: 150, settleMs: 300 }, deps);
  const stage = state.stage as Extract<FlowState["stage"], { kind: "apply" | "done" }>;
  return { end, stage, written, undone, order, rows: stage.steps.map((s) => [s.status, ...s.detail]) };
}

describe("runImport", () => {
  it("writes every group, sends the save, then reads Done with Undo", async () => {
    const r = await play();
    expect(r.end).toBe("done");
    expect(r.order).toEqual(["sleep", "sleep", "sleep", "save", "sleep", "done"]);
    expect(r.written).toEqual(["A0", "B0", "C0"]);
    expect(r.stage).toMatchObject({ kind: "done", count: 6, undone: false });
    expect(r.stage.kind === "done" && r.stage.undoLost).toBeFalsy();
    expect(r.rows).toEqual([["done", "1 setting"], ["done", "2 settings"], ["done", "3 settings"]]);
  });

  it("after a sign-in mid-import: written groups keep their check, the rest aren't imported", async () => {
    const r = await play({ ownerMovesAt: 0, kept: true });
    expect(r.end).toBe("owner");
    expect(r.written).toEqual(["A0"]);
    expect(r.rows).toEqual([["done", "1 setting"], ["stopped"], ["stopped"]]);
    expect(resultCopy(r.stage)).toEqual({
      heading: "Import stopped",
      lines: ["You signed in or out during the import, so it stopped."],
    });
  });

  it("after a sign-out mid-import: nothing is checked, and nothing was saved", async () => {
    const r = await play({ ownerMovesAt: 1, kept: false });
    expect(r.written).toEqual(["A0", "B0"]);
    expect(r.rows).toEqual([["stopped"], ["stopped"], ["stopped"]]);
    expect(resultCopy(r.stage).lines).toEqual([
      "You signed in or out during the import, so it stopped.",
      "Nothing from it was saved.",
    ]);
  });

  it("a sign-in once the last group is written reads Done, without Undo", async () => {
    const r = await play({ ownerMovesAt: 2, kept: true });
    expect(r.stage).toMatchObject({ kind: "done", count: 6, undoLost: true });
    expect(r.rows.every(([s]) => s === "done")).toBe(true);
  });

  it("a sign-out once the last group is written still says it wasn't saved", async () => {
    const r = await play({ ownerMovesAt: 2, kept: false });
    expect(r.stage).toMatchObject({ kind: "apply", failed: true, ownerChanged: "lost" });
  });

  it("a sign-in, or a sign-out once the save is in, during the pause before Done reads Done, without Undo", async () => {
    for (const [kept, saved] of [[true, false], [false, true]]) {
      const r = await play({ ownerMovesAt: 3, kept, saved });
      expect(r.stage).toMatchObject({ kind: "done", undoLost: true });
      expect(resultCopy(r.stage).heading).toBe("Imported 6 settings from MonkeyType");
    }
  });

  it("a sign-out during the pause before Done, with the save not confirmed, says nothing was saved", async () => {
    const r = await play({ ownerMovesAt: 3, kept: false, saved: false });
    expect(r.end).toBe("owner");
    expect(r.order).not.toContain("done");
    expect(r.rows).toEqual([["stopped"], ["stopped"], ["stopped"]]);
    expect(resultCopy(r.stage).lines).toContain("Nothing from it was saved.");
  });

  it("never spins on a stopped screen", async () => {
    for (const at of [0, 1, 2]) {
      const r = await play({ ownerMovesAt: at, kept: at % 2 === 0 });
      expect(r.rows.some(([s]) => s === "working" || s === "pending")).toBe(false);
    }
  });

  it("never waits for the save's answer before Done", async () => {
    const r = await play({ hang: true });
    expect(r.end).toBe("done");
    expect(r.order).toEqual(["sleep", "sleep", "sleep", "save", "sleep", "done"]);
    expect(r.stage).toMatchObject({ kind: "done", count: 6 });
  });

  it("a sign-in in the pause before Done doesn't wait on the save either", async () => {
    // A visitor's save can only be refused; the groups go into the account.
    const r = await play({ ownerMovesAt: 3, kept: true, hang: true });
    expect(r.order).not.toContain("wait");
    expect(r.stage).toMatchObject({ kind: "done", undoLost: true });
  });

  it("after a sign-out in the pause before Done, a save that never answers is unconfirmed, not unsaved", async () => {
    const r = await play({ ownerMovesAt: 3, kept: false, hang: true });
    expect(r.order.slice(-2)).toEqual(["sleep", "wait"]);
    expect(r.end).toBe("owner");
    // Every group was written and sent, so the rows keep their checks.
    expect(r.rows.map((row) => row[0])).toEqual(["done", "done", "done"]);
    expect(resultCopy(r.stage).lines).toEqual([
      "You signed in or out during the import, so it stopped.",
      "We couldn't confirm it was saved.",
    ]);
  });

  it("after a sign-out in the pause before Done, a refused save says nothing was saved", async () => {
    const r = await play({ ownerMovesAt: 3, kept: false, saved: false });
    expect(r.end).toBe("owner");
    expect(r.rows.map((row) => row[0])).toEqual(["stopped", "stopped", "stopped"]);
    expect(resultCopy(r.stage).lines).toContain("Nothing from it was saved.");
  });

  it("puts everything back when a write fails", async () => {
    const r = await play({ failAt: 1 });
    expect(r.end).toBe("failed");
    expect(r.undone).toBe(true);
    expect(r.rows).toEqual([["done", "1 setting"], ["failed", "This group couldn't be imported."], ["pending"]]);
  });
});

describe("runImport on the clock", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Real timers (faked): ms from the start until the run ends. */
  async function timed(movesOwner: boolean): Promise<number> {
    vi.useFakeTimers();
    let owner = true;
    let ended = -1;
    const deps: ImportRunDeps = {
      apply: () => {},
      undoAll: () => {},
      stillOwner: () => owner,
      kept: () => false,
      save: () => new Promise<boolean>(() => {}), // never answers
      sleep: (ms) => new Promise<void>((r) => setTimeout(r, ms)),
      dispatch: () => {},
    };
    const start = Date.now();
    void runImport(GROUPS, { pauseMs: 150, settleMs: STAGE_SETTLE_MS }, deps).then(() => {
      ended = Date.now() - start;
    });
    await vi.advanceTimersByTimeAsync(450);
    if (movesOwner) owner = false; // signed out in the pause before Done
    await vi.advanceTimersByTimeAsync(10_000);
    return ended;
  }

  it("reaches Done when the pause ends, whatever the save does", async () => {
    expect(await timed(false)).toBe(450 + STAGE_SETTLE_MS);
  });

  it("waits at most SAVE_WAIT_MS more after a sign-out", async () => {
    expect(await timed(true)).toBe(450 + STAGE_SETTLE_MS + SAVE_WAIT_MS);
  });
});
