import Link from "next/link";
import { ComparisonTrack } from "@/components/analysis/comparison-track";
import { MethodDisclosure } from "@/components/analysis/method-disclosure";
import { PageSection, Surface } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button";
import type { TypingSpeedUnit } from "@/lib/appearance-prefs";
import { secShort } from "@/lib/format-figure";
import type { Barrier } from "@/types/insights";
import {
  BARRIERS_EMPTY,
  barrierCoaching,
  barrierEvidence,
  barrierGain,
  barriersMethod,
  barrierTitle,
  barrierTrackLabel,
  NEXT_STEP_ROW,
  TRACK_LABELS,
} from "./barrier-copy";
import type { TestKind } from "./copy-phrases";
import { DashedNote } from "./dashed-note";
import { HELP_DESCRIPTION, HELP_TITLE } from "./insights-copy";
import { actionHref, actionLabel } from "./next-step-copy";

/** "What would help most" (spec-40 §3.3.1): up to three rows ranked by
 *  the time you'd get back. Row one is the verdict card's next step, so
 *  it says so instead of repeating the button. */
export function BarriersSection({
  items,
  firstIsNextStep,
  kind,
  unit,
  after,
}: {
  items: Barrier[];
  firstIsNextStep: boolean;
  kind: TestKind;
  unit: TypingSpeedUnit;
  /** A muted line under the section (the other half of the two-up when it
   *  has nothing to show yet). */
  after?: string;
}) {
  return (
    <PageSection id="help" title={HELP_TITLE} description={HELP_DESCRIPTION}>
      {items.length === 0 ? (
        <DashedNote>{BARRIERS_EMPTY}</DashedNote>
      ) : (
        <Surface as="ol" className="divide-y divide-border/70">
          {items.map((b, i) => (
            <BarrierRow key={b.kind} b={b} first={i === 0 && firstIsNextStep} unit={unit} />
          ))}
        </Surface>
      )}
      {after ? <p className="text-sm text-muted-foreground">{after}</p> : null}
      <MethodDisclosure>
        {barriersMethod(kind).map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </MethodDisclosure>
    </PageSection>
  );
}

function BarrierRow({ b, first, unit }: { b: Barrier; first: boolean; unit: TypingSpeedUnit }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-4 sm:px-5">
      <h3 className="text-base font-semibold text-foreground">{barrierTitle(b)}</h3>
      <p className="text-sm leading-relaxed text-foreground">{barrierEvidence(b)}</p>
      <ComparisonTrack
        better={b.better}
        recent={b.recent}
        max={Math.max(b.recent, b.better) * 1.25}
        format={(n) => secShort(n * 1000)}
        labels={TRACK_LABELS}
        ariaLabel={barrierTrackLabel(b)}
        className="my-1"
      />
      <p className="text-sm text-muted-foreground">{barrierCoaching(b)}</p>
      <p className="text-sm font-medium text-foreground">{barrierGain(b, unit)}</p>
      {first ? (
        <p className="text-sm text-muted-foreground">{NEXT_STEP_ROW}</p>
      ) : b.action?.kind === "drill" ? (
        <Link
          href={actionHref(b.action)}
          className={buttonVariants({ variant: "outline", className: "mt-1 h-11 w-full self-start sm:h-9 sm:w-auto" })}
        >
          {actionLabel(b.action)}
        </Link>
      ) : null}
    </li>
  );
}
