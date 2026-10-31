import { useId } from "react";
import { unchangedCount } from "@/lib/settings-import/plan";
import { COPY, type InputKind } from "./import-copy";
import type { Stage } from "./import-stage";
import { allMatchHeading, bridgeLine, reviewIntro, tallyLine } from "./review-copy";
import { ReviewExtras } from "./review-extras";
import { ReviewGroup } from "./review-group";
import { StageHeading } from "./stage-heading";

/** Review: the groups with something to change, each with a switch;
 *  then what already matches and what isn't imported. For a MonkeyType
 *  file muted lines say how many of its settings are used and how many
 *  of yours they cover, so the file's tally and its link to your counts
 *  stay on the screen people read (ui-law §12.10). A review matched
 *  again after a sign-in or sign-out says so first. */
export function ReviewStage({
  stage,
  inputKind,
  onToggle,
}: {
  stage: Extract<Stage, { kind: "review" }>;
  inputKind: InputKind;
  onToggle: (group: string) => void;
}) {
  const { plan, enabled } = stage;
  const recheckId = useId();
  const changing = plan.groups.filter((g) => g.items.length > 0);
  const total = changing.reduce((n, g) => n + g.items.length, 0);
  const recheck = stage.rechecked ? <p id={recheckId}>{COPY.recheckedLine}</p> : null;
  const bridge = plan.tally ? bridgeLine(plan.tally.used, total + unchangedCount(plan.groups)) : null;
  const tally = plan.tally ? (
    <>
      <p>{tallyLine(plan.tally.used, plan.settingsInFile, inputKind)}</p>
      {bridge ? <p>{bridge}</p> : null}
    </>
  ) : null;
  const describedBy = stage.rechecked ? recheckId : undefined;
  const extras = (
    <ReviewExtras
      groups={plan.groups}
      skipped={plan.skipped}
      source={plan.source}
      tally={plan.tally}
      settingsInFile={plan.settingsInFile}
      inputKind={inputKind}
    />
  );
  if (total === 0) {
    return (
      <div>
        <StageHeading describedBy={describedBy}>{allMatchHeading(inputKind)}</StageHeading>
        <div className="mt-1 flex flex-col gap-0.5 text-sm text-muted-foreground">
          {recheck}
          <p>{COPY.allMatchLine}</p>
          {tally}
        </div>
        {extras}
      </div>
    );
  }
  const [before, file, after] = reviewIntro(total, plan.fileLabel);
  return (
    <div>
      <StageHeading describedBy={describedBy}>{COPY.reviewHeading}</StageHeading>
      <div className="mt-1 flex flex-col gap-0.5 text-sm text-muted-foreground">
        {recheck}
        <p>
          {before}
          {plan.fileLabel ? (
            <span className="font-medium text-foreground [overflow-wrap:anywhere]">{file}</span>
          ) : (
            file
          )}
          {after}
        </p>
        {tally}
        <p>{COPY.reviewHint}</p>
      </div>
      <ul className="mt-4 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        {changing.map((g) => (
          <ReviewGroup
            key={g.id}
            group={g}
            enabled={enabled.includes(g.id)}
            onToggle={() => onToggle(g.id)}
          />
        ))}
      </ul>
      {extras}
    </div>
  );
}
