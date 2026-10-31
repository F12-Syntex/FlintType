import { describe, expect, it } from "vitest";
import sample from "@/lib/settings-import/fixtures/monkeytype-settings.json";
import { readCurrentSettings } from "@/lib/settings-import/slices";
import type { CurrentSettings } from "@/types/settings-import";
import { flowReducer, initialFlow, type FlowAction, type FlowState } from "./import-stage";
import { runCheck, type CheckDeps } from "./run-check";

const CANCELLED = Symbol("cancelled");
const TEXT = JSON.stringify(sample);

/** The defaults, with one caret change: whose store the match reads. */
const settingsOf = (caretStyle: string): CurrentSettings => {
  const current = readCurrentSettings("light");
  return { ...current, slices: { ...current.slices, caret: { ...current.slices.caret, style: caretStyle } } };
};
const STORES: Record<string, CurrentSettings> = { visitor: settingsOf("line"), user_1: settingsOf("block") };

/** Runs a check against the real reducer. `moveAfterLoads` switches the
 *  store's owner to user_1 once that many loads have happened, as a
 *  sign-in in another tab would. `pending`: a sign-in whose account
 *  copy hasn't loaded. */
async function play(input: { text: string }, moveAfterLoads = -1, pending = false) {
  let state: FlowState = initialFlow("monkeytype");
  let owner: string | null = null;
  let loads = 0;
  const checks: boolean[] = [];
  const deps: CheckDeps = {
    step: async (_ms, work) => {
      const out = await work();
      if (loads === moveAfterLoads) owner = "user_1";
      return out;
    },
    dispatch: (a: FlowAction) => {
      if (a.type === "check") checks.push(!!a.rechecked);
      state = flowReducer(state, a);
    },
    announce: () => {},
    load: async () => {
      loads++;
      return { owner, current: STORES[owner ?? "visitor"], pending };
    },
    owner: () => owner,
    cancelled: CANCELLED,
  };
  const result = await runCheck(input, "monkeytype", { checkStepMs: 0, settleMs: 0 }, deps);
  if (result) state = flowReducer(state, { type: "review", plan: result.plan });
  return { result, state, checks, loads };
}

const caretRow = (r: Awaited<ReturnType<typeof play>>) =>
  r.result?.plan.groups.flatMap((g) => [...g.items, ...g.unchanged]).find((i) => i.id === "caret.style");

describe("runCheck", () => {
  it("matches once, against the store's owner", async () => {
    const r = await play({ text: TEXT });
    expect(r.result?.owner).toBeNull();
    expect(r.checks).toEqual([false]);
    expect(r.state.stage).toMatchObject({ kind: "review" });
    expect(r.state.stage.kind === "review" && r.state.stage.rechecked).toBeFalsy();
  });

  it("matches again when the owner changes before the review shows, and says so", async () => {
    const r = await play({ text: TEXT }, 1);
    expect(r.loads).toBe(2);
    expect(r.checks).toEqual([false, true]);
    expect(r.result?.owner).toBe("user_1");
    expect(r.state.stage).toMatchObject({ kind: "review", rechecked: true });
    // "Now" is the signed-in store's value, not the visitor's.
    expect(caretRow(r)?.now).toBe(caretRow(await play({ text: TEXT }, 0))?.now);
    expect(caretRow(r)?.now).not.toBe(caretRow(await play({ text: TEXT }))?.now);
  });

  it("puts the bridge between the file's count and yours on lines of its own", async () => {
    let state: FlowState = initialFlow("monkeytype");
    const deps: CheckDeps = {
      step: async (_ms, work) => work(),
      dispatch: (a) => { state = flowReducer(state, a); },
      announce: () => {},
      load: async () => ({ owner: null, current: STORES.visitor, pending: false }),
      owner: () => null,
      cancelled: CANCELLED,
    };
    await runCheck({ text: TEXT }, "monkeytype", { checkStepMs: 0, settleMs: 0 }, deps);
    const match = state.stage.kind === "check" ? state.stage.steps[2] : undefined;
    expect(match?.detail).toHaveLength(2);
    expect(match?.detail[1]).toMatch(/^They cover \d+ of your settings$/);
    expect(match?.stack).toBe(true);
  });

  it("never matches while the account's own settings haven't loaded", async () => {
    const r = await play({ text: TEXT }, -1, true);
    expect(r.result).toBeNull();
    expect(r.state.stage).toMatchObject({ kind: "check", failure: { kind: "account-unavailable", step: 3 } });
  });

  it("reports a failed step and resolves to null", async () => {
    const r = await play({ text: "{ not json" });
    expect(r.result).toBeNull();
    expect(r.state.stage).toMatchObject({ kind: "check", failure: { kind: "not-json" } });
  });

  it("passes a superseded run's cancel on, and reports nothing for it", async () => {
    let state: FlowState = initialFlow("monkeytype");
    const deps: CheckDeps = {
      step: async () => { throw CANCELLED; },
      dispatch: (a) => { state = flowReducer(state, a); },
      announce: () => {},
      load: async () => ({ owner: null, current: readCurrentSettings(null), pending: false }),
      owner: () => null,
      cancelled: CANCELLED,
    };
    await expect(runCheck({ text: TEXT }, "monkeytype", { checkStepMs: 0, settleMs: 0 }, deps)).rejects.toBe(CANCELLED);
    expect(state.stage).toMatchObject({ kind: "check", failure: null });
  });
});
