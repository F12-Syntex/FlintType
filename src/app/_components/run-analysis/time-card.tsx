"use client";

import { BudgetTable } from "@/components/analysis/budget-table";
import { MinuteBar } from "@/components/analysis/minute-bar";
import { breakClause, fixingClause, secShort } from "@/lib/format-figure";
import { cn } from "@/lib/utils";
import { SLICE_ORDER, type SliceSet } from "@/types/typing-analysis";
import type { RunAnalysisView } from "../use-run-analysis";
import { type CopyUnit, flowLine } from "./finding-copy";

/** A flow speed this far above the run's speed earns its line. */
const FLOW_LINE_MIN_GAIN = 3;

const secondsOf = (s: SliceSet): SliceSet => ({
  typing: s.typing / 1000,
  fixing: s.fixing / 1000,
  before: s.before / 1000,
  inside: s.inside / 1000,
  breaks: s.breaks / 1000,
});

/** "Where the time went": the test's real seconds as one ink bar, its
 *  table twin (all five rows, always adding up to the test), and the
 *  flow speed when it reads clearly above the run's (spec-50 §3.5). No
 *  focus slice: the result screen's orange is the hero and "Next test".
 *  A plain block with its heading: the card around it is the one region. */
export function TimeCard({ view, unit, className }: { view: RunAnalysisView; unit: CopyUnit; className?: string }) {
  const { analysis, input } = view;
  const slices = analysis.slices;
  if (!slices) return null;
  const flow = analysis.flowWpm;
  const showFlow = flow != null && flow - input.wpm >= FLOW_LINE_MIN_GAIN;

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <h2 className="text-sm font-semibold text-foreground">Where the time went</h2>
      <MinuteBar
        className="mt-3"
        slices={secondsOf(slices)}
        total={analysis.T / 1000}
        focus={null}
        ends={["0 s", secShort(analysis.T)]}
      />
      <BudgetTable
        className="mt-4"
        rows={SLICE_ORDER.map((k) => ({ key: k, values: [slices[k] / 1000] }))}
        columns={["This test"]}
        unit="seconds"
        clauses={false}
        breakClause={breakClause(analysis.pace?.breakMs ?? 2000)}
        fixingClause={fixingClause(analysis.mistakes.fixMode)}
      />
      {showFlow ? (
        <p className="mt-3 text-sm text-muted-foreground">{flowLine(flow, unit.unit, unit.decimals)}</p>
      ) : null}
    </div>
  );
}
