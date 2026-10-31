"use client";

import { useCallback, useRef, useState } from "react";
import { flushPrefs, loadPrefs } from "@/lib/prefs-store";
import { applyGroup, readCurrentSettings } from "./apply";
import { settingsCount } from "./copy";
import { planMonkeytypeImport } from "./plan";
import { MAX_FILE_BYTES, MtImportError, readMonkeytypeFile } from "./read-file";
import { runSteps, type StepStatus } from "./run-steps";
import type { MtImportErrorKind, MtPlan } from "./types";

/** Each step shows for at least this long, so the list reads as one
 *  step after the next even though most of them take no time at all. */
const READ_STEP_MS = 350;
const APPLY_STEP_MS = 260;

export type MtStage = "reading" | "review" | "nothing" | "error" | "running" | "done";

export type MtStep = {
  id: string;
  label: string;
  detail?: string;
  status: StepStatus;
};

export type MtImportFailure = MtImportErrorKind | "read-failed" | "apply-failed";

export type MtImportState = {
  open: boolean;
  stage: MtStage;
  fileName: string;
  steps: MtStep[];
  plan: MtPlan | null;
  error: MtImportFailure | null;
  /** After a run: true when the account has the settings, false when
   *  they are on this device only. */
  savedToAccount: boolean | null;
};

const CLOSED: MtImportState = {
  open: false,
  stage: "reading",
  fileName: "",
  steps: [],
  plan: null,
  error: null,
  savedToAccount: null,
};

/** The MonkeyType settings import as a small state machine: read the
 *  file and match it (two steps), show the review, then apply one group
 *  per step and save. A newer `start` or a close stops a read; an apply
 *  always finishes its writes, so closing mid-way never leaves half an
 *  import, and only its screen updates stop. */
export function useMonkeytypeImport() {
  const [state, setState] = useState<MtImportState>(CLOSED);
  const runRef = useRef(0);
  const planRef = useRef<MtPlan | null>(null);

  /** Marks one step's status, unless a newer run has taken over. */
  const stepUpdater = useCallback(
    (run: number) => (id: string, status: StepStatus) => {
      if (runRef.current !== run) return;
      setState((s) => ({
        ...s,
        steps: s.steps.map((step) => (step.id === id ? { ...step, status } : step)),
      }));
    },
    [],
  );

  const start = useCallback(async (file: File) => {
    const run = ++runRef.current;
    const isCurrent = () => runRef.current === run;
    planRef.current = null;
    setState({
      ...CLOSED,
      open: true,
      fileName: file.name,
      steps: [
        { id: "read", label: `Reading ${file.name}`, status: "waiting" },
        { id: "match", label: "Matching your settings", status: "waiting" },
      ],
    });
    // Filled in by the steps (an object, so the reads below see it).
    const out: { mt?: Record<string, unknown>; plan?: MtPlan } = {};
    const result = await runSteps(
      [
        {
          id: "read",
          run: async () => {
            if (file.size > MAX_FILE_BYTES) throw new MtImportError("too-big");
            out.mt = readMonkeytypeFile(await file.text());
          },
        },
        {
          id: "match",
          run: async () => {
            await loadPrefs();
            out.plan = planMonkeytypeImport(out.mt ?? {}, readCurrentSettings());
          },
        },
      ],
      { minMs: READ_STEP_MS, onChange: stepUpdater(run), isCurrent },
    );
    if (!isCurrent()) return;
    const plan = out.plan;
    if (!result.ok || !plan) {
      const error = result.ok ? null : result.error;
      setState((s) => ({
        ...s,
        stage: "error",
        error: error instanceof MtImportError ? error.kind : "read-failed",
      }));
      return;
    }
    planRef.current = plan;
    setState((s) => ({ ...s, stage: plan.changes === 0 ? "nothing" : "review", plan }));
  }, [stepUpdater]);

  const confirm = useCallback(async () => {
    const plan = planRef.current;
    if (!plan || plan.changes === 0) return;
    planRef.current = null;
    const run = ++runRef.current;
    setState((s) => ({
      ...s,
      stage: "running",
      steps: [
        ...plan.groups.map((g): MtStep => ({
          id: g.id,
          label: g.title,
          detail: settingsCount(g.rows.length),
          status: "waiting",
        })),
        { id: "save", label: "Saving your settings", status: "waiting" },
      ],
    }));
    const save = { toAccount: false };
    const result = await runSteps(
      [
        ...plan.groups.map((g) => ({ id: g.id, run: () => applyGroup(g) })),
        { id: "save", run: async () => void (save.toAccount = await flushPrefs()) },
      ],
      { minMs: APPLY_STEP_MS, onChange: stepUpdater(run) },
    );
    if (runRef.current !== run) return;
    setState((s) =>
      result.ok
        ? { ...s, stage: "done", savedToAccount: save.toAccount }
        : { ...s, stage: "error", error: "apply-failed" },
    );
  }, [stepUpdater]);

  const close = useCallback(() => {
    runRef.current += 1;
    setState((s) => ({ ...s, open: false }));
  }, []);

  return { state, start, confirm, close };
}
