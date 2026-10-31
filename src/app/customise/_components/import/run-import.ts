import type { ImportGroup, ImportItem } from "@/types/settings-import";
import { SAVE_WAIT_MS } from "./flow-timing";
import { COPY, settingsCount } from "./import-copy";
import type { FlowAction } from "./import-stage";

/** The Importing screen's work: each switched-on group written in turn,
 *  reported to the dialog's state machine as it goes. Only this loop
 *  reports a sign-in or sign-out while importing, because only it knows
 *  which groups were written. Pure apart from what `deps` does. */

export type ImportRunDeps = {
  /** Write one group's items; throws if a write fails. */
  apply: (items: readonly ImportItem[]) => void;
  /** Put back everything written so far, after a failed write. */
  undoAll: () => void;
  /** Whether the prefs store still belongs to whoever imported (`canUndo`). */
  stillOwner: () => boolean;
  /** After an owner change: whether the groups written stay in the
   *  store now in use. A sign-in carries them into the account; a
   *  sign-out or account switch drops them, unsaved, with the old store. */
  kept: () => boolean;
  /** Send the import's save now (`flushPrefs`); resolves to whether the
   *  server confirmed it. Done never waits on it. */
  save: () => Promise<boolean>;
  sleep: (ms: number) => Promise<void>;
  dispatch: (action: FlowAction) => void;
};

export type ImportRunEnd = "done" | "failed" | "owner";

/** Write `groups`, pausing `pauseMs` after each, then send the save and
 *  pause `settleMs` before Done. The owner is checked after every pause,
 *  before the next write and before Done, so nothing is written into
 *  someone else's store and every row says what really happened to its
 *  group. The save starts before the last pause, and Done never waits
 *  for it. Only a sign-out or account switch in that pause waits for its
 *  answer, for at most `SAVE_WAIT_MS`, to say whether anything was saved. */
export async function runImport(
  groups: readonly ImportGroup[],
  timing: { pauseMs: number; settleMs: number },
  deps: ImportRunDeps,
): Promise<ImportRunEnd> {
  const { dispatch } = deps;
  const count = groups.reduce((n, g) => n + g.items.length, 0);
  const stepDone = (i: number) => dispatch({ type: "step-done", index: i, detail: [settingsCount(groups[i].items.length)] });

  for (const [i, g] of groups.entries()) {
    try {
      deps.apply(g.items);
    } catch {
      deps.undoAll();
      dispatch({ type: "step-failed", index: i, detail: [COPY.groupFailed] });
      return "failed";
    }
    if (timing.pauseMs > 0) await deps.sleep(timing.pauseMs);
    if (!deps.stillOwner()) {
      const written = i + 1;
      const kept = deps.kept();
      if (kept) stepDone(i);
      // Every group is in the account: that's Done, just without Undo.
      if (kept && written === groups.length) dispatch({ type: "done", count, undoLost: true });
      else dispatch({ type: "owner-stopped", written, kept });
      return "owner";
    }
    stepDone(i);
  }
  const saving = deps.save().catch(() => false);
  if (timing.settleMs > 0) await deps.sleep(timing.settleMs);
  if (!deps.stillOwner()) {
    // Signed in or out after every group was written. Carried into the
    // new account, or saved to the old one: Done, but no Undo. A save
    // that hasn't answered in time is unknown, never called unsaved.
    const kept = deps.kept();
    const saved = kept || (await Promise.race([saving, deps.sleep(SAVE_WAIT_MS).then(() => "unsure" as const)]));
    if (saved === true) dispatch({ type: "done", count, undoLost: true });
    else dispatch({ type: "owner-stopped", written: groups.length, kept: false, unsure: saved === "unsure" });
    return "owner";
  }
  dispatch({ type: "done", count });
  return "done";
}
