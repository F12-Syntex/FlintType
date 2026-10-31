import { useId } from "react";
import type { ImportSource } from "@/types/settings-import";
import { checkHeading, COPY, failHeading, failureCopy, type InputKind } from "./import-copy";
import type { Stage } from "./import-stage";
import { StageHeading } from "./stage-heading";
import { StepList } from "./step-list";

/** Checking: read, identify, match, each turning done as its work
 *  finishes; a failure shows under its step with what to do next. A
 *  check run again after a sign-in or sign-out says so in the line under
 *  the heading, which is reserved on every check so the rows never move. */
export function CheckStage({
  stage,
  source,
  inputKind,
}: {
  stage: Extract<Stage, { kind: "check" }>;
  source: ImportSource;
  inputKind: InputKind;
}) {
  const failureId = useId();
  const lineId = useId();
  const heading = stage.failure ? failHeading(inputKind) : checkHeading(inputKind);
  const rechecked = stage.rechecked && !stage.failure;
  return (
    <div>
      <StageHeading describedBy={stage.failure ? failureId : rechecked ? lineId : undefined}>{heading}</StageHeading>
      <p id={lineId} className="mt-1 min-h-5 text-sm text-muted-foreground">
        {rechecked ? COPY.recheckingLine : null}
      </p>
      <StepList
        label={heading}
        steps={stage.steps}
        failure={stage.failure ? failureCopy(stage.failure, source, inputKind) : null}
        failureId={failureId}
      />
    </div>
  );
}
