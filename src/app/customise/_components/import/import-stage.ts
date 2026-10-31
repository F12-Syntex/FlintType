import type { ImportFailure, ImportPlan, ImportSource } from "@/types/settings-import";
import type { InputKind } from "./import-copy";

/** The settings import dialog as a state machine: Choose → Checking
 *  (read, identify, match) → Review → Importing → Done (or undone). The
 *  flow hook does the work and reports each step here. Pure. */

/** `stopped`: a group a stopped import didn't import (ui-law §12.10). */
export type StepStatus = "pending" | "working" | "done" | "failed" | "stopped";
/** `stack`: the detail parts are sentences, so each takes its own line. */
export type Step = { label: string; status: StepStatus; detail: string[]; stack?: boolean };

export type Stage =
  | { kind: "choose" }
  /** `rechecked`: run again because the store changed owner (a sign-in
   *  or sign-out) after the settings were matched. */
  | { kind: "check"; steps: Step[]; failure: ImportFailure | null; rechecked?: boolean }
  | { kind: "review"; plan: ImportPlan; enabled: string[]; rechecked?: boolean }
  /** `ownerChanged`: stopped by a sign-in or sign-out, not a failed
   *  write. "kept" when the groups it wrote stay (a sign-in carries them
   *  into the account), "lost" when they went with the old store, and
   *  "unsure" when every group was sent but the save never answered. */
  | { kind: "apply"; plan: ImportPlan; groups: string[]; steps: Step[]; failed: boolean; ownerChanged?: "kept" | "lost" | "unsure" }
  /** `undoLost`: signed in or out since, so Undo can't run (`canUndo`). */
  | { kind: "done"; plan: ImportPlan; groups: string[]; steps: Step[]; count: number; undone: boolean; undoLost?: boolean };

export type FlowState = {
  source: ImportSource;
  /** The paste box, kept while the user goes back to edit it. */
  text: string;
  inputKind: InputKind;
  stage: Stage;
};

export type FlowAction =
  | { type: "reset"; source: ImportSource }
  | { type: "text"; text: string }
  | { type: "check"; inputKind: InputKind; labels: string[]; source?: ImportSource; rechecked?: boolean }
  | { type: "step-done"; index: number; detail: string[]; stack?: boolean }
  | { type: "step-failed"; index: number; failure?: ImportFailure; detail?: string[] }
  | { type: "review"; plan: ImportPlan }
  | { type: "toggle"; group: string }
  | { type: "apply"; groups: string[]; labels: string[] }
  /** `undoLost`: every group was written, then the store changed owner. */
  | { type: "done"; count: number; undoLost?: boolean }
  | { type: "undone" }
  /** The store changed owner after Done, so Undo can't run. */
  | { type: "undo-lost" }
  /** The store changed owner while importing, after `written` groups. */
  | { type: "owner-stopped"; written: number; kept: boolean; unsure?: boolean }
  | { type: "choose" };

export const initialFlow = (source: ImportSource): FlowState => ({
  source,
  text: "",
  inputKind: "file",
  stage: { kind: "choose" },
});

const pending = (label: string): Step => ({ label, status: "pending", detail: [] });

/** Mark step `i` done (or failed) and start the next one. */
function advance(steps: Step[], i: number, patch: Partial<Step>): Step[] {
  return steps.map((s, j) => {
    if (j === i) return { ...s, ...patch };
    if (j === i + 1 && patch.status === "done") return { ...s, status: "working" };
    return s;
  });
}

/** Groups with something to change start switched on. */
export const groupsToImport = (plan: ImportPlan) =>
  plan.groups.filter((g) => g.items.length > 0).map((g) => g.id);

export function flowReducer(state: FlowState, action: FlowAction): FlowState {
  const { stage } = state;
  switch (action.type) {
    case "reset":
      return initialFlow(action.source);
    case "text":
      return { ...state, text: action.text };
    case "choose":
      return { ...state, stage: { kind: "choose" } };
    case "check": {
      const steps = action.labels.map(pending);
      steps[0] = { ...steps[0], status: "working" };
      return {
        ...state,
        source: action.source ?? state.source,
        inputKind: action.inputKind,
        stage: { kind: "check", steps, failure: null, ...(action.rechecked ? { rechecked: true } : {}) },
      };
    }
    case "step-done":
      if (stage.kind !== "check" && stage.kind !== "apply") return state;
      // A stopped import's rows are final.
      if (stage.kind === "apply" && stage.failed) return state;
      return {
        ...state,
        stage: {
          ...stage,
          steps: advance(stage.steps, action.index, { status: "done", detail: action.detail, ...(action.stack ? { stack: true } : {}) }),
        },
      };
    case "step-failed":
      if (stage.kind === "check") {
        const steps = advance(stage.steps, action.index, { status: "failed", detail: action.detail ?? [] });
        return { ...state, stage: { ...stage, steps, failure: action.failure ?? null } };
      }
      if (stage.kind === "apply") {
        const steps = advance(stage.steps, action.index, { status: "failed", detail: action.detail ?? [] });
        return { ...state, stage: { ...stage, steps, failed: true } };
      }
      return state;
    case "review": {
      const rechecked = stage.kind === "check" && stage.rechecked ? { rechecked: true } : {};
      return { ...state, stage: { kind: "review", plan: action.plan, enabled: groupsToImport(action.plan), ...rechecked } };
    }
    case "toggle": {
      if (stage.kind !== "review") return state;
      const on = stage.enabled.includes(action.group);
      const enabled = on ? stage.enabled.filter((g) => g !== action.group) : [...stage.enabled, action.group];
      return { ...state, stage: { ...stage, enabled } };
    }
    case "apply": {
      if (stage.kind !== "review") return state;
      const steps = action.labels.map(pending);
      if (steps.length) steps[0] = { ...steps[0], status: "working" };
      return { ...state, stage: { kind: "apply", plan: stage.plan, groups: action.groups, steps, failed: false } };
    }
    case "done":
      if (stage.kind !== "apply" || stage.failed) return state;
      return {
        ...state,
        stage: { ...stage, kind: "done", count: action.count, undone: false, ...(action.undoLost ? { undoLost: true } : {}) },
      };
    case "undone":
      if (stage.kind !== "done" || stage.undoLost) return state;
      return { ...state, stage: { ...stage, undone: true } };
    case "undo-lost":
      if (stage.kind !== "done" || stage.undone || stage.undoLost) return state;
      return { ...state, stage: { ...stage, undoLost: true } };
    case "owner-stopped": {
      if (stage.kind !== "apply" || stage.failed) return state;
      // Kept (or sent but unconfirmed) groups keep their check; every other row reads not imported.
      const sent = action.kept || action.unsure;
      const steps = stage.steps.map((s, j): Step =>
        sent && j < action.written ? { ...s, status: "done" } : { ...s, status: "stopped", detail: [] },
      );
      const ownerChanged = action.unsure ? "unsure" : action.kept ? "kept" : "lost";
      return { ...state, stage: { ...stage, steps, failed: true, ownerChanged } };
    }
  }
}

/** The dialog can't be closed while an import is being written. Once
 *  every group is written, closing keeps the import. */
export const isDismissible = (stage: Stage) =>
  !(stage.kind === "apply" && !stage.failed && stage.steps.some((s) => s.status !== "done"));

/** A check run again because the store changed owner is a screen of
 *  its own, so its heading takes focus with the line saying why. */
const checkKey = (stage: Extract<Stage, { kind: "check" }>) => (stage.rechecked ? "check-again" : "check");

/** Changes when a new screen (or a failure on one) appears, so focus can
 *  move to its heading. */
export function stageKey(stage: Stage): string {
  if (stage.kind === "check") return stage.failure ? "check-failed" : checkKey(stage);
  if (stage.kind === "apply") return stage.failed ? "apply-failed" : "apply";
  if (stage.kind === "done") return stage.undone ? "undone" : stage.undoLost ? "undo-lost" : "done";
  return stage.kind;
}

/** Which screen is on, for its fade-in (ui-law §13). Importing, Done and
 *  Undone are one screen: its rows stay mounted, so only what really
 *  changes moves (each check, then the put-back icons). */
export function screenKey(stage: Stage): string {
  if (stage.kind === "check") return checkKey(stage);
  return stage.kind === "apply" || stage.kind === "done" ? "result" : stage.kind;
}
