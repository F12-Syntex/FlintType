import { identify } from "@/lib/settings-import/detect";
import { planFlinttype } from "@/lib/settings-import/flinttype";
import { planMonkeytype } from "@/lib/settings-import/monkeytype";
import { changeCount, unchangedCount } from "@/lib/settings-import/plan";
import { readInput } from "@/lib/settings-import/read";
import type { CurrentSettings, ImportFailure, ImportPlan, ImportSource } from "@/types/settings-import";
import { FT_GROUP_DEFS, ftGroupOf } from "./ft-groups";
import {
  announceIdentify, announceMatch, announceRead, identifyDetail, matchDetails, readDetail, stepLabels,
} from "./import-copy";
import type { FlowAction } from "./import-stage";

/** The Checking screen's work: read, identify, match, each reported to
 *  the dialog's state machine once its real work has finished. Pure
 *  apart from what `deps` does. */

export type ImportInput = { file: File } | { text: string };

export type CheckDeps = {
  /** Do `work`, then wait out the rest of `minMs`; throws if a newer
   *  run has taken over (and that throw is passed on). */
  step: <T>(minMs: number, work: () => T | Promise<T>) => Promise<T>;
  dispatch: (action: FlowAction) => void;
  announce: (text: string) => void;
  /** Whose settings the prefs store holds, and what they are, once loaded. */
  load: () => Promise<{ owner: string | null; current: CurrentSettings; pending: boolean }>;
  /** Whose settings the store holds now. */
  owner: () => string | null;
  /** Thrown by `step` when superseded. */
  cancelled: unknown;
};

/** Check `input` as `source` settings. `rechecked` marks a run started
 *  again because the store changed owner. Resolves to the plan and the
 *  owner whose settings it was matched against, or null once a step has
 *  failed (shown under that step). A sign-in or sign-out before the
 *  review shows starts the match over, so a review never describes
 *  someone else's settings. */
export async function runCheck(
  input: ImportInput,
  source: ImportSource,
  timing: { checkStepMs: number; settleMs: number },
  deps: CheckDeps,
  rechecked = false,
): Promise<{ plan: ImportPlan; owner: string | null } | null> {
  const { dispatch, step } = deps;
  const kind = "file" in input ? "file" : "text";
  const name = "file" in input ? input.file.name : undefined;
  const fail = (index: number, failure: ImportFailure) => {
    dispatch({ type: "step-failed", index, failure });
    return null;
  };
  let at = 0;
  dispatch({ type: "check", inputKind: kind, labels: stepLabels(source, kind), source, rechecked });
  try {
    const read = await step(timing.checkStepMs, () => readInput(input));
    if (!read.ok) return fail(0, read.failure);
    dispatch({ type: "step-done", index: 0, detail: readDetail({ kind, name, bytes: read.bytes }) });
    deps.announce(announceRead(kind, name));

    at = 1;
    const id = await step(timing.checkStepMs, () => identify(read.text, source));
    if (!id.ok) return fail(1, id.failure);
    const exportedAt = id.source === "flinttype" ? id.exportedAt : undefined;
    dispatch({ type: "step-done", index: 1, detail: [identifyDetail(source, kind, id.settingsInFile, exportedAt)] });
    deps.announce(announceIdentify(source, kind));

    at = 2;
    const { plan, owner, pending } = await step(timing.checkStepMs, async () => {
      const { owner, current, pending } = await deps.load();
      const plan =
        id.source === "monkeytype"
          ? planMonkeytype(id.payload, current, name ?? null)
          : planFlinttype(
              id.slices,
              current,
              { fileLabel: name ?? null, settingsInFile: id.settingsInFile, exportedAt },
              FT_GROUP_DEFS,
              ftGroupOf,
            );
      return { plan, owner, pending };
    });
    // Never match against a store that doesn't hold the account's copy yet.
    if (pending) return fail(2, { kind: "account-unavailable", step: 3 });
    const usable = changeCount(plan.groups) + unchangedCount(plan.groups);
    if (usable === 0) return fail(2, { kind: "nothing-usable", step: 3 });
    // A MonkeyType file counts its own settings, so its numbers add up
    // to the total above; one of them can set several of yours, which
    // the review counts, so the step bridges the two.
    const found = plan.tally?.used ?? usable;
    const detail = matchDetails(source, found, usable);
    dispatch({ type: "step-done", index: 2, detail, stack: detail.length > 1 });
    deps.announce(announceMatch(source, found, usable));

    await step(timing.settleMs, () => undefined);
    if (deps.owner() !== owner) return runCheck(input, source, timing, deps, true);
    return { plan, owner };
  } catch (err) {
    if (err === deps.cancelled) throw err;
    // Anything unexpected reads as a file we can't use.
    return fail(at, { kind: at === 0 ? "unreadable" : "not-settings", step: (at + 1) as 1 | 2 | 3 });
  }
}
