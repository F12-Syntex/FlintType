import { describe, expect, it } from "vitest";
import type { ImportPlan } from "@/types/settings-import";
import { flowReducer, initialFlow, isDismissible, screenKey, stageKey, type FlowState } from "./import-stage";

const item = (id: string) => ({ id, label: id, now: "a", to: "b", target: { kind: "mode" as const }, value: "dark" });
const PLAN: ImportPlan = {
  source: "monkeytype",
  fileLabel: "x.json",
  settingsInFile: 3,
  groups: [
    { id: "colours", name: "Colours", items: [item("a"), item("b")], unchanged: [] },
    { id: "caret", name: "Caret", items: [], unchanged: [item("c")] },
    { id: "font", name: "Font", items: [item("d")], unchanged: [] },
  ],
  skipped: [],
};

const run = (actions: Parameters<typeof flowReducer>[1][], from: FlowState = initialFlow("monkeytype")) =>
  actions.reduce(flowReducer, from);

describe("flowReducer", () => {
  it("walks the check steps one at a time", () => {
    const s = run([
      { type: "check", inputKind: "file", labels: ["Read", "Identify", "Match"] },
      { type: "step-done", index: 0, detail: ["x.json", "4 KB"] },
    ]);
    expect(s.stage.kind === "check" && s.stage.steps.map((st) => st.status)).toEqual(["done", "working", "pending"]);
  });

  it("stops at a failed step and leaves the rest pending", () => {
    const s = run([
      { type: "check", inputKind: "text", labels: ["Read", "Identify", "Match"] },
      { type: "step-done", index: 0, detail: [] },
      { type: "step-failed", index: 1, failure: { kind: "not-json", step: 2 } },
    ]);
    expect(s.inputKind).toBe("text");
    expect(s.stage).toMatchObject({ kind: "check", failure: { kind: "not-json" } });
    expect(s.stage.kind === "check" && s.stage.steps.map((st) => st.status)).toEqual(["done", "failed", "pending"]);
    expect(stageKey(s.stage)).toBe("check-failed");
  });

  it("switches on only the groups with something to change", () => {
    const s = run([{ type: "review", plan: PLAN }]);
    expect(s.stage).toMatchObject({ kind: "review", enabled: ["colours", "font"] });
    const off = flowReducer(s, { type: "toggle", group: "colours" });
    expect(off.stage).toMatchObject({ enabled: ["font"] });
    expect(flowReducer(off, { type: "toggle", group: "colours" }).stage).toMatchObject({ enabled: ["font", "colours"] });
  });

  it("can't be closed while importing, only before and after", () => {
    const applying = run([
      { type: "review", plan: PLAN },
      { type: "apply", groups: ["colours", "font"], labels: ["Colours", "Font"] },
    ]);
    expect(isDismissible(applying.stage)).toBe(false);
    const oneWritten = run([{ type: "step-done", index: 0, detail: ["2 settings"] }], applying);
    expect(isDismissible(oneWritten.stage)).toBe(false);
    // Every group is written: closing now keeps the import.
    const allWritten = run([{ type: "step-done", index: 1, detail: ["1 setting"] }], oneWritten);
    expect(isDismissible(allWritten.stage)).toBe(true);
    const done = run([{ type: "done", count: 3 }], allWritten);
    expect(done.stage).toMatchObject({ kind: "done", count: 3, undone: false });
    expect(isDismissible(done.stage)).toBe(true);
    expect(stageKey(flowReducer(done, { type: "undone" }).stage)).toBe("undone");
  });

  it("stops an import whose group fails, and never reports it done", () => {
    const failed = run([
      { type: "review", plan: PLAN },
      { type: "apply", groups: ["colours"], labels: ["Colours"] },
      { type: "step-failed", index: 0, detail: ["This group couldn't be imported."] },
      { type: "done", count: 2 },
    ]);
    expect(failed.stage).toMatchObject({ kind: "apply", failed: true });
    expect(isDismissible(failed.stage)).toBe(true);
  });

  it("keeps the pasted text when going back to edit it", () => {
    const s = run([
      { type: "text", text: "{ oops" },
      { type: "check", inputKind: "text", labels: ["a", "b", "c"] },
      { type: "choose" },
    ]);
    expect(s).toMatchObject({ text: "{ oops", stage: { kind: "choose" } });
  });

  it("switches source to import a file as the other app", () => {
    const s = run([{ type: "check", inputKind: "file", labels: ["a", "b", "c"], source: "flinttype" }]);
    expect(s.source).toBe("flinttype");
  });
});

describe("a sign-in or sign-out during or after an import", () => {
  const applying = () =>
    run([
      { type: "review", plan: PLAN },
      { type: "apply", groups: ["colours", "font"], labels: ["Colours", "Font"] },
      { type: "step-done", index: 0, detail: ["2 settings"] },
    ]);
  const statuses = (s: FlowState) => (s.stage.kind === "apply" || s.stage.kind === "done" ? s.stage.steps.map((st) => st.status) : []);

  it("after a sign-in, keeps the groups written and marks the rest not imported", () => {
    const s = run([{ type: "owner-stopped", written: 1, kept: true }], applying());
    expect(s.stage).toMatchObject({ kind: "apply", failed: true, ownerChanged: "kept" });
    expect(statuses(s)).toEqual(["done", "stopped"]);
    expect(stageKey(s.stage)).toBe("apply-failed");
  });

  it("after a sign-out with the save unanswered, keeps every check and says it's unconfirmed", () => {
    const s = run([{ type: "owner-stopped", written: 2, kept: false, unsure: true }], applying());
    expect(s.stage).toMatchObject({ kind: "apply", failed: true, ownerChanged: "unsure" });
    expect(statuses(s)).toEqual(["done", "done"]);
  });

  it("after a sign-out, marks every group not imported, its count gone", () => {
    const s = run([{ type: "owner-stopped", written: 1, kept: false }], applying());
    expect(s.stage).toMatchObject({ ownerChanged: "lost" });
    expect(statuses(s)).toEqual(["stopped", "stopped"]);
    expect(s.stage.kind === "apply" && s.stage.steps[0].detail).toEqual([]);
  });

  it("never changes a stopped import's rows: a late step-done or done does nothing", () => {
    const stopped = run([{ type: "owner-stopped", written: 1, kept: true }], applying());
    expect(run([{ type: "step-done", index: 1, detail: ["1 setting"] }, { type: "done", count: 3 }], stopped)).toEqual(stopped);
    expect(statuses(stopped).includes("working")).toBe(false);
    expect(flowReducer(stopped, { type: "owner-stopped", written: 2, kept: false })).toBe(stopped);
  });

  it("reads Done without Undo when every group was written before the owner changed", () => {
    const s = run([{ type: "step-done", index: 1, detail: ["1 setting"] }, { type: "done", count: 3, undoLost: true }], applying());
    expect(s.stage).toMatchObject({ kind: "done", undoLost: true, undone: false });
    expect(statuses(s)).toEqual(["done", "done"]);
    expect(stageKey(s.stage)).toBe("undo-lost");
  });

  it("takes Undo away from Done, and a later Undo does nothing", () => {
    const done = run([{ type: "step-done", index: 1, detail: ["1 setting"] }, { type: "done", count: 3 }], applying());
    const s = run([{ type: "undo-lost" }, { type: "undone" }], done);
    expect(s.stage).toMatchObject({ kind: "done", undoLost: true, undone: false });
    expect(stageKey(s.stage)).toBe("undo-lost");
    expect(run([{ type: "undo-lost" }], s)).toBe(s);
  });

  it("changes nothing after Undo, or on any other screen", () => {
    const done = run([{ type: "step-done", index: 1, detail: ["1 setting"] }, { type: "done", count: 3 }], applying());
    const undone = flowReducer(done, { type: "undone" });
    expect(flowReducer(undone, { type: "undo-lost" })).toBe(undone);
    const review = run([{ type: "review", plan: PLAN }]);
    expect(flowReducer(review, { type: "undo-lost" })).toBe(review);
    expect(flowReducer(review, { type: "owner-stopped", written: 0, kept: false })).toBe(review);
  });

  it("carries a re-run check through to its review", () => {
    const s = run([
      { type: "check", inputKind: "file", labels: ["a", "b", "c"], rechecked: true },
      { type: "review", plan: PLAN },
    ]);
    expect(s.stage).toMatchObject({ kind: "review", rechecked: true });
    const plain = run([{ type: "check", inputKind: "file", labels: ["a", "b", "c"] }, { type: "review", plan: PLAN }]);
    expect(plain.stage.kind === "review" && plain.stage.rechecked).toBeFalsy();
  });
});

describe("a check run again after a sign-in or sign-out", () => {
  it("is a new screen, so focus moves to its heading and the line under it is read", () => {
    const labels = ["Read", "Identify", "Match"];
    const checked = run([0, 1, 2].map((index) => ({ type: "step-done" as const, index, detail: ["x"] })), run([
      { type: "check", inputKind: "file", labels },
    ]));
    const again = flowReducer(checked, { type: "check", inputKind: "file", labels, rechecked: true });
    expect([checked, again].map((s) => stageKey(s.stage))).toEqual(["check", "check-again"]);
    expect([checked, again].map((s) => screenKey(s.stage))).toEqual(["check", "check-again"]);
    // A failure on it still takes focus, and its Review says it was checked again.
    expect(stageKey(flowReducer(again, { type: "step-failed", index: 0, failure: { kind: "empty", step: 1 } }).stage)).toBe("check-failed");
    expect(flowReducer(again, { type: "review", plan: PLAN }).stage).toMatchObject({ kind: "review", rechecked: true });
  });
});

describe("screenKey", () => {
  it("keeps Importing, Done and Undone on one screen, so their rows stay mounted", () => {
    const applying = run([
      { type: "review", plan: PLAN },
      { type: "apply", groups: ["colours"], labels: ["Colours"] },
    ]);
    const done = run([{ type: "step-done", index: 0, detail: ["2 settings"] }, { type: "done", count: 2 }], applying);
    const keys = [applying, done, flowReducer(done, { type: "undone" })].map((s) => screenKey(s.stage));
    expect(keys).toEqual(["result", "result", "result"]);
    // Focus still moves to each new heading.
    expect([applying, done].map((s) => stageKey(s.stage))).toEqual(["apply", "done"]);
  });

  it("gives every other screen its own key", () => {
    const check = run([{ type: "check", inputKind: "file", labels: ["a", "b", "c"] }]);
    const review = run([{ type: "review", plan: PLAN }]);
    expect([initialFlow("monkeytype"), check, review].map((s) => screenKey(s.stage))).toEqual(["choose", "check", "review"]);
  });
});
