import { useId } from "react";
import type { Stage } from "./import-stage";
import { resultCopy } from "./result-copy";
import { StageHeading } from "./stage-heading";
import { GroupStepList } from "./step-list";

/** Importing, then the outcome: done or undone (the group rows stay as
 *  a receipt either way), or stopped. One screen throughout: the line
 *  under the heading is reserved while importing, so when Done's line
 *  comes in the rows stay where they are. */
export function ResultStage({ stage }: { stage: Extract<Stage, { kind: "apply" | "done" }> }) {
  const lineId = useId();
  const undone = stage.kind === "done" && stage.undone;
  const { heading, lines } = resultCopy(stage);
  return (
    <div>
      <StageHeading describedBy={lines.length > 0 ? lineId : undefined}>{heading}</StageHeading>
      <div id={lineId} className="mt-1 flex min-h-5 flex-col text-sm text-muted-foreground">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <GroupStepList label={heading} steps={stage.steps} reverted={undone} />
    </div>
  );
}
