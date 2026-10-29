import { PageSection } from "@/components/page-shell";
import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import type { BarriersSection as BarriersData, ChangesSection as ChangesData, NextStep } from "@/types/insights";
import { barriersLearning } from "./barrier-copy";
import { BarriersSection } from "./barriers-section";
import { changesLearning } from "./change-copy";
import { ChangesSection } from "./changes-section";
import type { TestKind } from "./copy-phrases";
import { DashedNote } from "./dashed-note";
import { HELP_DESCRIPTION, HELP_TITLE } from "./insights-copy";

/** "What would help most" beside "What changed" (spec-40 §3.3), as §5
 *  two-up cards. When one side has nothing to show yet, the other spans
 *  both columns and the missing side becomes one muted line under it.
 *  With the analysis store missing both sides would repeat the time
 *  section's not-ready line word for word, so the row is left out. */
export function HelpAndChanges({
  barriers,
  changes,
  nextStep,
  kind,
  unit,
}: {
  barriers: BarriersData;
  changes: ChangesData;
  nextStep: NextStep;
  kind: TestKind;
  unit: TypingSpeedUnit;
}) {
  if (barriers.status === "not-ready" && changes.status === "not-ready") return null;
  const changesLine = changes.status === "learning" ? changesLearning(changes.gate, kind) : undefined;
  const barriersLine = barriers.status === "learning" ? barriersLearning(barriers.gate, kind) : undefined;
  const firstIsNextStep = nextStep.kind === "barrier";

  if (barriers.status === "ready" && changes.status === "ready") {
    return (
      <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-6">
        <BarriersSection items={barriers.items} firstIsNextStep={firstIsNextStep} kind={kind} unit={unit} />
        <ChangesSection items={changes.items} earlierN={changes.earlierN} unit={unit} />
      </div>
    );
  }
  if (barriers.status === "ready") {
    return (
      <BarriersSection
        items={barriers.items}
        firstIsNextStep={firstIsNextStep}
        kind={kind}
        unit={unit}
        after={changesLine}
      />
    );
  }
  if (changes.status === "ready") {
    return <ChangesSection items={changes.items} earlierN={changes.earlierN} unit={unit} after={barriersLine} />;
  }
  // Neither side is ready: one card for the next thing to unlock.
  return (
    <PageSection id="help" title={HELP_TITLE} description={HELP_DESCRIPTION}>
      {barriersLine ? <DashedNote>{barriersLine}</DashedNote> : null}
      {changesLine ? <p className="text-sm text-muted-foreground">{changesLine}</p> : null}
    </PageSection>
  );
}
