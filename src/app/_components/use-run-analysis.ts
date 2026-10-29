"use client";

import { useMemo } from "react";
import { formatTestName } from "@/lib/test-name";
import { parseRunBucketKey } from "@/lib/test-bucket";
import { analyseRun } from "@/lib/typing-analysis/analyse";
import type { RunAnalysis, RunAnalysisSource, RunInput } from "@/types/typing-analysis";
import { usePractice } from "./practice-state";

export type RunAnalysisView = {
  analysis: RunAnalysis;
  input: RunInput;
  /** The provider's source: the submitted run, the settings preview's
   *  fixed one, or the clone's (always present when the view is). */
  source: RunAnalysisSource;
  noun: string; // formatTestName(...).noun, e.g. "Adapt test of 25 words"
  group: string; // formatTestName(...).group
  isAdapt: boolean; // the bucket's mode is "training"
};

/** The finished run's analysis, computed once (spec-50 §3.2). Called only
 *  by `TestSummary`, which passes the view down to the analysis card
 *  (`run-analysis/`) and the optional cards, so `analyseRun` runs once
 *  per finished run. Every practice provider supplies the source
 *  (the real screen before paint, the settings preview a fixed one, the
 *  live clone one built from the broadcaster's settings); the hook never
 *  builds one, so it never falls back to the viewer's own settings. */
export function useRunAnalysis(): RunAnalysisView | null {
  const { state, runAnalysisSource } = usePractice();
  const ready = state.phase === "done" && state.mode !== "BURST" && state.events.length > 0;
  const source = ready ? (runAnalysisSource ?? null) : null;

  // Analysed and named once per source.
  return useMemo(() => {
    if (!source) return null;
    let analysis: RunAnalysis | null;
    try {
      // analyseRun never throws (I8); this is a second guard, since the
      // live clone hands it another user's payload.
      analysis = analyseRun(source.input);
    } catch {
      analysis = null;
    }
    if (!analysis) return null;
    // Named strictly from the source's bucket, the kind of test it is
    // stored and compared as, so the name always matches the data.
    const spec = parseRunBucketKey(source.bucket);
    const name = formatTestName(
      spec
        ? { mode: spec.mode, lengthMode: spec.lengthMode, length: spec.length, touch: spec.touch }
        : { lengthMode: source.input.lengthMode, length: 0 },
    );
    return {
      analysis,
      input: source.input,
      source,
      noun: name.noun,
      group: name.group,
      isAdapt: spec?.mode === "training",
    };
  }, [source]);
}
