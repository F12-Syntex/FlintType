import type { Finding, RunAnalysis } from "@/types/typing-analysis";
import { type CopyUnit, type FindingCopy, findingCopy, pbCopy } from "./finding-copy";

/** What "What happened" lists, in order (spec-50 §3.4). Pure, so the
 *  partial-view rule is tested without rendering. */

/** The findings that stay true when the events cover only part of the
 *  run: each describes something seen in the part shown. Breaks,
 *  start-up and slow-down need the run's start or end, which a partial
 *  view can't see (a live-clone window that starts after word 0 puts the
 *  unseen head into Breaks; events cut at the cap put the unseen tail
 *  there). An even run, a short run and a timing note are claims about
 *  the whole test, so they go too. */
const PARTIAL_SAFE: ReadonlySet<Finding["kind"]> = new Set(["fixing", "left", "before", "inside"]);

/** The line that opens a partial view's list. */
export const PARTIAL_NOTE: FindingCopy = {
  icon: "info",
  lead: ["This shows only part of the test."],
  follow: ["It leaves out how the test started and ended, and any breaks."],
};

/** The engine's findings this view may state, in the engine's order. */
export function shownFindings(analysis: Pick<RunAnalysis, "findings" | "quality">): Finding[] {
  if (!analysis.quality.partial) return analysis.findings;
  return analysis.findings.filter((f) => PARTIAL_SAFE.has(f.kind));
}

/** The list: the PB line when the run is a best, the partial note when
 *  the view covers only part of the test, then the shown findings. */
export function findingItems(a: {
  analysis: Pick<RunAnalysis, "findings" | "quality">;
  unit: CopyUnit;
  /** Null when the run isn't a new best. */
  pb: { noun: string; wpm: number; previousBest: number | null | undefined } | null;
}): FindingCopy[] {
  const items = shownFindings(a.analysis).map((f) => findingCopy(f, a.unit));
  if (a.analysis.quality.partial) items.unshift(PARTIAL_NOTE);
  if (a.pb) items.unshift(pbCopy({ ...a.unit, ...a.pb }));
  return items;
}
