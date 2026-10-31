import { COPY, doneHeading } from "./import-copy";
import type { Stage } from "./import-stage";

/** The heading of the Importing, Done and Undone screen, and the lines
 *  under it. Importing has none, but the dialog reserves their first line
 *  from the start, so the group rows never move when Done's line comes
 *  in (ui-law §12.10). Pure. */
export function resultCopy(stage: Extract<Stage, { kind: "apply" | "done" }>): { heading: string; lines: string[] } {
  if (stage.kind === "apply") {
    if (!stage.failed) return { heading: COPY.importingHeading, lines: [] };
    if (!stage.ownerChanged) return { heading: COPY.stoppedHeading, lines: [COPY.stoppedLine] };
    const why = { kept: [], lost: [COPY.ownerLostLine], unsure: [COPY.ownerUnsureLine] }[stage.ownerChanged];
    return { heading: COPY.stoppedHeading, lines: [COPY.ownerStoppedLine, ...why] };
  }
  if (stage.undone) return { heading: COPY.undoneHeading, lines: [COPY.undoneLine] };
  return {
    heading: doneHeading(stage.count, stage.plan.source),
    lines: stage.undoLost ? [COPY.doneLine, COPY.undoLostLine] : [COPY.doneLine],
  };
}
